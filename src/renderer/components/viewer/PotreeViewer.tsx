import React, { useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { join } from "path";
import { CENTER, MeshBVH } from "three-mesh-bvh";
import PointCloudService from "../../services/PointCloudService";
import StatusBarActions from "../../store/actions/StatusBarActions";
import PotreeService from "../../services/PotreeService";
// PotreeBackgroundService artık potree.js içinde yapılıyor
// import PotreeBackgroundService from "../../services/PotreeBackgroundService";
import FPSMeter from "../FPSMeter";
import Compass from "../Compass";
import OrbitController from "../OrbitController";
import { RootState } from "../../store/store";
import "../../services/EventEmitter";
import ProjectActions from "../../store/actions/ProjectActions";
import PotreeViewerSettingsPanel from "./PotreeViewerSettingsPanel";
import { MonitorCog, Settings } from "lucide-react";
import { Button } from "../ui/button";
import AppActions from "../../store/actions/AppActions";
import MeshService from "../../services/MeshService";

const PotreeViewer: React.FC<{ display: string }> = ({ display }) => {
  const potreeRenderAreaRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLElement | null>(null);
  const [isMouseWheelHeld, setIsMouseWheelHeld] = React.useState(false);
  const [isObjectMoving, setIsObjectMoving] = React.useState(false);
  const [isPotreeReady, setIsPotreeReady] = React.useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = React.useState(false);
  const webGLContextLost = React.useRef(false);
  const viewerLoadedRef = React.useRef(false); // Viewer'ın yüklenip yüklenmediğini takip et
  const loadViewerRef = React.useRef<(() => Promise<void>) | null>(null);
  const handleContextLostRef = React.useRef<
    ((event: Event) => Promise<void>) | null
  >(null);
  const handleContextRestoredRef = React.useRef<(() => Promise<void>) | null>(
    null
  );
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastCallTime = useRef(0);
  const intersectedPointCloud = useRef<string>("");
  const intersectedMeshModel = useRef<string>("");
  const lookingModel = useRef<"mesh-model" | "point-cloud" | "none">("none");
  const meshDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const clear = useCallback(async () => {
    await PointCloudService.removePointClouds();
  }, []);

  // handleContextLost ve handleContextRestored'ı önce tanımla (loadViewer'da kullanılacak)
  const handleContextRestored = useCallback(async () => {
    console.log("✅ WebGL context RESTORED - PotreeViewer");

    webGLContextLost.current = false;
    if (potreeRenderAreaRef && potreeRenderAreaRef.current) {
      if (canvasRef.current) {
        if (handleContextLostRef.current) {
          canvasRef.current.removeEventListener(
            "webglcontextlost",
            handleContextLostRef.current
          );
        }
        if (handleContextRestoredRef.current) {
          canvasRef.current.removeEventListener(
            "webglcontextrestored",
            handleContextRestoredRef.current
          );
        }
      }
      potreeRenderAreaRef.current.innerHTML = "";

      // Reset viewer loaded flag so it can be reloaded after context restore
      viewerLoadedRef.current = false;

      //   setOrbitControllerKey((prev) => prev + 1);
      if (loadViewerRef.current) {
        await loadViewerRef.current();
      }
      //   ToolsActions.firstLoad(true);
      //   LeftMenuActions.setSelectedMenu("");
      //   setTimeout(() => {
      //     LeftMenuActions.setSelectedMenu("3d");
      //   }, 10);
    }
  }, []);

  // handleContextRestored'ı ref'e kaydet
  React.useEffect(() => {
    handleContextRestoredRef.current = handleContextRestored;
  }, [handleContextRestored]);

  const handleContextLost = useCallback(
    async (event: Event) => {
      if (event && event.preventDefault) {
        event.preventDefault(); // 🔴 En önemli satır bu
      }
      // console.warn("WebGL context LOST");
      console.error("❌ WebGL context LOST - PotreeViewer");
      webGLContextLost.current = true; // UI'ı güncelle
      // console.error("Context Lost Gerçekleşti");
      await clear();
      window.viewer?.renderer?.dispose();
      window.viewer?.scene?.scene?.dispose();
      const oldCanvas = window.viewer?.renderer?.domElement;
      oldCanvas?.remove();

      setTimeout(() => {
        if (handleContextRestoredRef.current) {
          handleContextRestoredRef.current();
        }
      }, 100);
      // viewer.scene.dispose() vs. gibi temizleme yapılabilir
    },
    [clear]
  );

  // handleContextLost'u ref'e kaydet
  React.useEffect(() => {
    handleContextLostRef.current = handleContextLost;
  }, [handleContextLost]);

  // loadViewer fonksiyonunu tanımla (handleContextRestored'da ref üzerinden kullanılacak)
  const loadViewer = useCallback(async () => {
    try {
      // Potree'nin yüklü olduğundan emin ol
      if (typeof window.Potree === "undefined") {
        return;
      }

      // Eğer viewer zaten varsa, tekrar yükleme
      if (window.viewer) {
        return;
      }

      const elRenderArea = document.getElementById("potree_render_area");
      if (!elRenderArea) {
        return;
      }

      // Sidebar container'ın DOM'da olduğundan emin ol
      const waitForSidebarContainer = (): Promise<void> => {
        return new Promise((resolve) => {
          const checkSidebar = () => {
            const sidebarContainer = document.getElementById(
              "potree_sidebar_container"
            );
            if (sidebarContainer) {
              resolve();
            } else {
              // Eğer container yoksa, bir sonraki render cycle'da tekrar kontrol et
              requestAnimationFrame(checkSidebar);
            }
          };
          checkSidebar();
        });
      };

      await waitForSidebarContainer();

      const viewerArgs = {
        noDragAndDrop: true,
        useDefaultRenderLoop: false,
      };
      window.pointSizeType = 1;
      window.viewer = new window.Potree.Viewer(elRenderArea, viewerArgs);

      window.viewer.loadGUI(async () => {
        if (!window.viewer.profileWindowController) {
          window.eventBus.emit("heightProfileLoad", {
            viewer: window.viewer,
          });
        }

        // Add lights to scene for mesh rendering
        // Check if lights already exist to avoid duplicates
        const existingLights = window.viewer.scene.scene.children.filter(
          (child: any) => child.isLight
        );

        if (existingLights.length === 0) {
          // Add directional light
          const directionalLight = new window.THREE.DirectionalLight(
            0xffffff,
            0.8
          );
          directionalLight.position.set(10, 10, 10);
          directionalLight.lookAt(new window.THREE.Vector3(0, 0, 0));
          window.viewer.scene.scenePointCloud.add(directionalLight);

          // Add ambient light for overall illumination
          const ambientLight = new window.THREE.AmbientLight(0xffffff, 0.4);
          window.viewer.scene.scenePointCloud.add(ambientLight);

          console.log("Lights added to scene for mesh rendering");
        }

        const rotgisCanvas = document.getElementById("rotgis-canvas");
        canvasRef.current = rotgisCanvas ? rotgisCanvas : null;
        const canvas = canvasRef.current;
        if (canvas) {
          if (handleContextLostRef.current) {
            canvas.addEventListener(
              "webglcontextlost",
              handleContextLostRef.current,
              false
            );
          }
          if (handleContextRestoredRef.current) {
            canvas.addEventListener(
              "webglcontextrestored",
              handleContextRestoredRef.current,
              false
            );
          }
        }

        // Background ayarları artık potree.js içinde yapılıyor (constructor'da)
        // PotreeBackgroundService.setupGradientGridBackground(window.viewer);
        // window.viewer.renderer.setClearColor(0x1f1f1f, 1);
        // window.viewer.setBackground("gradient-grid");
      });
    } catch (error) {
      console.error(error);
      return;
    }
  }, []);

  // loadViewer'ı ref'e kaydet
  React.useEffect(() => {
    loadViewerRef.current = loadViewer;
  }, [loadViewer]);

  // Potree'nin yüklenmesini bekle
  useEffect(() => {
    const checkPotreeReady = () => {
      if (typeof window.Potree !== "undefined" || (window as any).potreeReady) {
        setIsPotreeReady(true);
        return true;
      }
      return false;
    };

    // Eğer Potree zaten yüklüyse
    if (checkPotreeReady()) {
      return;
    }

    // Potree ready event'ini dinle
    const handlePotreeReady = () => {
      setIsPotreeReady(true);
      AppActions.setViewerLoaded(true);
    };

    window.addEventListener("potreeReady", handlePotreeReady);

    // Polling fallback - eğer event gelmezse kontrol et
    const pollInterval = setInterval(() => {
      if (checkPotreeReady()) {
        clearInterval(pollInterval);
      }
    }, 100);

    // Timeout - 10 saniye sonra hata ver
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!isPotreeReady) {
        console.error("❌ Potree yüklenemedi - timeout");
      }
    }, 10000);

    return () => {
      window.removeEventListener("potreeReady", handlePotreeReady);
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isPotreeReady]);

  // Potree.js'den gelen webglcontextlost event'ini dinle
  useEffect(() => {
    const handlePotreeContextLost = (data: any) => {
      console.log("📢 Potree.js'den webglcontextlost event'i alındı");
      if (data && data.event) {
        handleContextLost(data.event);
      } else {
        // Event yoksa yeni bir event oluştur
        const syntheticEvent = new Event("webglcontextlost");
        handleContextLost(syntheticEvent);
      }
    };

    if (window.eventBus) {
      window.eventBus.on("potree:webglcontextlost", handlePotreeContextLost);
    }

    return () => {
      if (window.eventBus) {
        window.eventBus.off("potree:webglcontextlost", handlePotreeContextLost);
      }
    };
  }, [handleContextLost]);

  // Potree hazır olduğunda viewer'ı yükle
  // display === "block" olduğunda yükle (visibility kontrolü render'da yapılıyor)
  // Sadece bir kere yüklenecek şekilde kontrol ediliyor
  useEffect(() => {
    if (!isPotreeReady) {
      return;
    }

    // Only load viewer if display is block and viewer doesn't exist and hasn't been loaded yet
    // display prop'u hala kullanılıyor ama render'da visibility kullanılıyor
    // viewerLoadedRef kontrolü ile viewer'ın sadece 1 kez yüklenmesini garanti ediyoruz
    if (display === "block" && !window.viewer && !viewerLoadedRef.current) {
      viewerLoadedRef.current = true; // Flag'i set et, tekrar yüklenmesini önle
      const loadPotreeViewer = async () => {
        // loadViewer içinde de window.viewer kontrolü var, ama yine de burada da kontrol ediyoruz
        if (!window.viewer) {
          await loadViewer();
        } else {
          viewerLoadedRef.current = true; // Viewer zaten varsa flag'i set et
        }
      };

      loadPotreeViewer();
    }

    return () => {
      // Cleanup sadece component unmount olduğunda yapılmalı
      // Display değiştiğinde viewer'ı dispose etme, sadece gizle
      if (canvasRef.current) {
        canvasRef.current.removeEventListener(
          "webglcontextlost",
          handleContextLost
        );
        canvasRef.current.removeEventListener(
          "webglcontextrestored",
          handleContextRestored
        );
      }
    };
  }, [isPotreeReady, display]);

  useEffect(() => {
    const handleMouseDown = (event: any) => {
      if (event.button === 0) {
        setIsObjectMoving(true); // Mouse Left
      }
      if (event.button === 1) {
        setIsMouseWheelHeld(true); // Middle Mouse Button
      }
    };

    const handleMouseUp = (event: any) => {
      if (event.button === 0) {
        setIsObjectMoving(false); // Mouse Left
      }
      if (event.button === 1) {
        setIsMouseWheelHeld(false); // Middle Mouse Button
      }
    };

    if (display == "block") {
      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mouseup", handleMouseUp);
      //   MeasurementManager.load();
    } else {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [display]);

  const loadPointCloud = (pointCloudPath: string, id: string) => {
    window.Potree.loadPointCloud(pointCloudPath, id, (e: any) => {
      window.viewer.scene.addPointCloud(e.pointcloud);
      //e.pointcloud.position.z = 0;

      // Add type information to point cloud
      e.pointcloud.modelType = "pc";
      e.pointcloud.name = id;

      const material = e.pointcloud.material;
      material.size = 1;
      // material.pointSizeType = window.Potree.PointSizeType.ATTENUATED;
      // material.pointSizeType = window.Potree.PointSizeType.ADAPTIVE;
      //   material.heightMin = pointCloud.properties.bbox.min.z;
      //   material.heightMax = pointCloud.properties.bbox.max.z;
      material.pointSizeType = window.pointSizeType;
      //PointCloudManager.setPointBudget(5000000);
      PotreeService.setNodeSize(80);
      material.coloringType = 0;
      material.gradientValue = "SPECTRAL";
      window.viewer.setControls(window.viewer.earthControls);

      // Set visibility from Redux store
      const projectState = ProjectActions.getProjectState();
      const pointCloudMetadata =
        projectState.project?.metadata?.pointCloud?.find((pc) => pc.id === id);
      if (pointCloudMetadata) {
        const shouldBeVisible = pointCloudMetadata.visible !== false;
        e.pointcloud._visible = shouldBeVisible;
      }

      // Don't auto-zoom when loading - let user focus manually via LayerBox
      // window.viewer.zoomTo(e.pointcloud, 1.2);

      // Camera rotation tracking'i başlat
      setupCameraRotationTracking(window.viewer);

      //   PotreeService.zoomToBBox("pc");
    });
  };

  // Camera rotation değişikliğini takip et ve EventEmitter ile ilet
  const setupCameraRotationTracking = (viewer: any) => {
    if (!viewer || !viewer.scene) return;

    let lastYaw: number | null = null;
    const THRESHOLD = 0.01; // 0.01 radyan (~0.57 derece) eşik değeri - performans için

    const checkRotationChange = () => {
      try {
        if (!viewer.scene || !viewer.scene.view) return;

        const view = viewer.scene.view;
        if (typeof view.yaw !== "undefined") {
          // Sadece belirli bir eşik değerinden fazla değiştiyse emit et
          if (lastYaw === null || Math.abs(view.yaw - lastYaw) > THRESHOLD) {
            lastYaw = view.yaw;

            // Yaw'ı dereceye çevir (0-360 arası)
            let yawDegrees = (view.yaw * 180) / Math.PI;
            yawDegrees = yawDegrees % 360;
            if (yawDegrees < 0) yawDegrees += 360;

            // Pitch'i dereceye çevir
            const pitchDegrees =
              typeof view.pitch !== "undefined"
                ? (view.pitch * 180) / Math.PI
                : 0;

            // EventEmitter'a emit et (hem yaw hem pitch)
            if (window.eventBus) {
              window.eventBus.emit("camera-rotation-changed", {
                yaw: yawDegrees,
                pitch: pitchDegrees,
              });
            }
          }
        }
      } catch (error) {
        // Hata durumunda sessizce devam et
      }
    };

    // Potree'nin update event'ini dinle
    viewer.addEventListener("update", checkRotationChange);
  };

  // Get project metadata from Redux store
  const project = useSelector(
    (state: RootState) => state.projectReducer.project
  );
  // Aktif nokta bulutu (status bar'da gösterilen) - measure bu ID'ye kaydedilir
  const pointCloudData = useSelector(
    (state: RootState) => state.statusBarReducer.modelData
  );

  // Track if this is the first load (for initial focus)
  const isFirstLoadRef = React.useRef(true);
  const previousPointCloudCountRef = React.useRef(0);
  // Track the currently active/focused point cloud
  const activePointCloudIdRef = React.useRef<string | null>(null);
  // Flag to prevent event listener from adding measurements during loading
  const isLoadingMeasurementsRef = React.useRef(false);
  // Map to store pending measurements and their save timeouts
  const pendingMeasurementsRef = React.useRef<Map<string, NodeJS.Timeout>>(
    new Map()
  );
  // Debounce map for marker moved updates (to avoid too frequent updates)
  const markerMovedDebounceRef = React.useRef<Map<string, NodeJS.Timeout>>(
    new Map()
  );

  // Listen to measurement events and save to Redux
  useEffect(() => {
    if (!window.viewer || !window.viewer.scene) {
      return;
    }

    // Function to save measurement to Redux
    const saveMeasurementToRedux = (measurement: any) => {
      const pointClouds = project?.metadata?.pointCloud || [];
      if (pointClouds.length === 0) return;

      // Check if measurement has valid points (not all 0,0,0)
      const measurementData = PotreeService.createMeasurementData(measurement);
      const hasValidPoints = measurementData.points.some((point: number[]) => {
        return point[0] !== 0 || point[1] !== 0 || point[2] !== 0;
      });

      // Don't save if points are all 0,0,0 (drawing not finished)
      if (!hasValidPoints && measurementData.points.length > 0) {
        return;
      }

      // For Height and Angle measurements, check if maxMarkers is reached
      // Height: maxMarkers = 2, Angle: maxMarkers = 3
      const measurementName = measurement.name || measurementData.name || "";
      const isHeight = measurementName === "Height" || measurement.showHeight;
      const isAngle = measurementName === "Angle" || measurement.showAngles;

      if (isHeight || isAngle) {
        const maxMarkers = measurement.maxMarkers || (isHeight ? 2 : 3);
        const currentPoints = measurement.points
          ? measurement.points.length
          : measurementData.points.length;

        // Don't save if maxMarkers is not reached (drawing not finished)
        if (currentPoints < maxMarkers) {
          return;
        }
      }

      // Status bar'daki aktif nokta bulutu ID'si ile eşleşen point cloud'a kaydet
      let targetPointCloudId: string | null =
        pointCloudData?.id && pointClouds.some((pc) => pc.id === pointCloudData.id)
          ? pointCloudData.id
          : null;

      // Fallback: aktif point cloud veya ilk görünür
      if (!targetPointCloudId) {
        targetPointCloudId =
          activePointCloudIdRef.current ||
          (window as any).activePointCloudId ||
          null;
        if (!targetPointCloudId && pointClouds.length > 0) {
          targetPointCloudId = pointClouds[0].id;
        }
      }

      if (!targetPointCloudId) return;

      // Calculate measurement extent from points
      let minX = Infinity,
        minY = Infinity,
        minZ = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity;

      if (measurementData.points && measurementData.points.length > 0) {
        measurementData.points.forEach((point: number[]) => {
          minX = Math.min(minX, point[0]);
          minY = Math.min(minY, point[1]);
          minZ = Math.min(minZ, point[2]);
          maxX = Math.max(maxX, point[0]);
          maxY = Math.max(maxY, point[1]);
          maxZ = Math.max(maxZ, point[2]);
        });
      } else {
        // Set default extent if no points
        minX = 0;
        minY = 0;
        minZ = 0;
        maxX = 0;
        maxY = 0;
        maxZ = 0;
      }

      // Determine measurement type from measurement properties
      let measurementType = "point";
      if (measurementData.showArea) {
        measurementType = "area";
      } else if (
        measurementData.showDistances &&
        measurementData.points &&
        measurementData.points.length > 2
      ) {
        measurementType = "polygon";
      } else if (measurementData.points && measurementData.points.length > 1) {
        measurementType = "line";
      }

      // Create measurement layer
      const extent = {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
      };

      // Get measurement icon based on measurement properties (using RibbonMenu icon names)
      let iconPath: string | undefined;
      // Determine icon based on measurement type
      if (measurementData.showHeight) {
        iconPath = "RulerDimensionLine"; // Height
      } else if (measurementData.showArea && measurementData.showDistances) {
        iconPath = "VectorSquare"; // Area
      } else if (
        measurementData.showDistances &&
        !measurementData.showArea &&
        !measurementData.showAngles
      ) {
        iconPath = "Spline"; // Distance
      } else if (
        measurementData.points &&
        measurementData.points.length === 1
      ) {
        iconPath = "Circle"; // Point
      } else if (measurementData.showAngles) {
        iconPath = "Tangent"; // Angle
      } else if (measurementData.showArea) {
        iconPath = "VectorSquare"; // Area
      } else {
        iconPath = "Spline"; // Distance (default)
      }

      const measurementLayer = {
        id: measurementData.uuid || `measurement-${Date.now()}`,
        name: measurementData.name || `Measurement ${measurementType}`,
        type: "measurement" as const,
        visible: measurementData.visible !== false,
        extent: extent,
        measurementType: measurementType,
        pointCloudId: targetPointCloudId,
        points: measurementData.points,
        showDistances: measurementData.showDistances,
        showArea: measurementData.showArea,
        showCoordinates: measurementData.showCoordinates,
        closed: measurementData.closed,
        showAngles: measurementData.showAngles,
        showHeight: measurementData.showHeight,
        showCircle: measurementData.showCircle,
        showAzimuth: measurementData.showAzimuth,
        showEdges: measurementData.showEdges,
        color: measurementData.color,
        icon: iconPath,
      };

      ProjectActions.addMeasurementLayer(targetPointCloudId, measurementLayer);
    };

    // Handle measurement finished event from event emitter (called when drawing is complete)
    const handleMeasurementFinished = (data: any) => {
      if (isLoadingMeasurementsRef.current) {
        return;
      }

      const measurement = data.measurement;
      if (!measurement) return;

      const measurementId = measurement.uuid;
      if (!measurementId) return;

      // Clear any pending timeout for this measurement
      const existingTimeout = pendingMeasurementsRef.current.get(measurementId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        pendingMeasurementsRef.current.delete(measurementId);
      }

      // Save measurement immediately since drawing is confirmed finished
      saveMeasurementToRedux(measurement);
    };

    const handleMeasurementAdded = (event: any) => {
      // Skip if we're currently loading measurements from project (to avoid duplicates)
      if (isLoadingMeasurementsRef.current) {
        return;
      }

      const measurement = event.measurement;
      if (!measurement) return;

      // Don't save here - wait for measurement-finished event from event emitter
      // This event is fired when measurement drawing is actually complete
      // No timeout here to prevent premature saving
    };

    // Listen to marker_added events (for tracking, but don't save based on this)
    // We only save when measurement-finished event is emitted from event emitter
    const handleMarkerAdded = (event: any) => {
      // Don't save here - wait for measurement-finished event from event emitter
      // This is just for tracking purposes if needed in the future
    };

    const handleMeasurementRemoved = (event: any) => {
      const measurement = event.measurement;
      if (!measurement) return;

      const measurementId = measurement.uuid || measurement.id;
      if (!measurementId) return;

      // Sahne grafiğinden garanti kaldır (bazen Potree sadece diziden çıkarıyor)
      if (measurement.parent) {
        measurement.removeFromParent();
      }

      // Redux'tan measurement layer'ı kaldır
      const pointClouds = project?.metadata?.pointCloud || [];
      for (const pc of pointClouds) {
        if (pc.layers) {
          const layer = pc.layers.find((l) => l.id === measurementId);
          if (layer) {
            ProjectActions.removeMeasurementLayer(pc.id, measurementId);
            break;
          }
        }
      }
    };

    // When a measurement is added, we don't need to add marker listeners
    // because we only save when measurement-finished event is emitted
    const handleMeasurementAddedWithMarkerListener = (event: any) => {
      handleMeasurementAdded(event);
      // No need to add marker listeners - we wait for event emitter
    };

    // Helper function to update a measurement layer
    const updateMeasurementLayerFromPotree = (
      potreeMeasurement: any,
      layer: any,
      pointCloudId: string
    ) => {
      // Clear existing debounce timeout for this measurement
      const existingTimeout = markerMovedDebounceRef.current.get(layer.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Debounce the update (wait 300ms after last move event)
      const timeout = setTimeout(() => {
        // Update the measurement layer with new data from Potree
        const measurementData =
          PotreeService.createMeasurementData(potreeMeasurement);

        // Calculate new extent from points
        let minX = Infinity,
          minY = Infinity,
          minZ = Infinity;
        let maxX = -Infinity,
          maxY = -Infinity,
          maxZ = -Infinity;

        if (measurementData.points && measurementData.points.length > 0) {
          measurementData.points.forEach((point: number[]) => {
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
            minZ = Math.min(minZ, point[2]);
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
            maxZ = Math.max(maxZ, point[2]);
          });
        } else {
          minX = 0;
          minY = 0;
          minZ = 0;
          maxX = 0;
          maxY = 0;
          maxZ = 0;
        }

        // Determine measurement type
        let measurementType = "point";
        if (measurementData.showArea) {
          measurementType = "area";
        } else if (
          measurementData.showDistances &&
          measurementData.points &&
          measurementData.points.length > 2
        ) {
          measurementType = "polygon";
        } else if (
          measurementData.points &&
          measurementData.points.length > 1
        ) {
          measurementType = "line";
        }

        // Get measurement icon
        let iconPath: string | undefined;
        if (measurementData.showHeight) {
          iconPath = "RulerDimensionLine";
        } else if (measurementData.showArea && measurementData.showDistances) {
          iconPath = "VectorSquare";
        } else if (
          measurementData.showDistances &&
          !measurementData.showArea &&
          !measurementData.showAngles
        ) {
          iconPath = "Spline";
        } else if (
          measurementData.points &&
          measurementData.points.length === 1
        ) {
          iconPath = "Circle";
        } else if (measurementData.showAngles) {
          iconPath = "Tangent";
        } else if (measurementData.showArea) {
          iconPath = "VectorSquare";
        } else {
          iconPath = "Spline";
        }

        const updatedMeasurementLayer = {
          ...layer,
          extent: {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ },
          },
          points: measurementData.points,
          showDistances: measurementData.showDistances,
          showArea: measurementData.showArea,
          showCoordinates: measurementData.showCoordinates,
          closed: measurementData.closed,
          showAngles: measurementData.showAngles,
          showHeight: measurementData.showHeight,
          showCircle: measurementData.showCircle,
          showAzimuth: measurementData.showAzimuth,
          showEdges: measurementData.showEdges,
          color: measurementData.color,
          icon: iconPath,
        };

        ProjectActions.updateMeasurementLayer(
          pointCloudId,
          updatedMeasurementLayer
        );

        // Remove timeout from map after execution
        markerMovedDebounceRef.current.delete(layer.id);
      }, 300);

      // Store timeout in map
      markerMovedDebounceRef.current.set(layer.id, timeout);
    };

    // Handle marker moved event - update measurement when marker is moved
    const handleMarkerMoved = (data: any) => {
      if (isLoadingMeasurementsRef.current) {
        return;
      }

      // Only handle measurement type marker moves (not height-profile)
      if (data.type !== "measurement" || !data.measurement) {
        return;
      }

      const potreeMeasurement = data.measurement;
      const measurementId = potreeMeasurement.uuid;
      if (!measurementId) return;

      // Find the measurement layer in Redux
      const pointClouds = project?.metadata?.pointCloud || [];

      for (const pc of pointClouds) {
        if (!pc.layers) continue;

        const layer = pc.layers.find(
          (l) => l.id === measurementId && l.type === "measurement"
        );

        if (layer) {
          updateMeasurementLayerFromPotree(potreeMeasurement, layer, pc.id);
          break; // Found the layer, no need to continue
        }
      }
    };

    // Handle marker_dropped event from Potree scene (alternative method)
    const handleMarkerDropped = (event: any) => {
      if (isLoadingMeasurementsRef.current) {
        return;
      }

      const potreeMeasurement = event.measurement;
      if (!potreeMeasurement) return;

      const measurementId = potreeMeasurement.uuid;
      if (!measurementId) return;

      // Find the measurement layer in Redux
      const pointClouds = project?.metadata?.pointCloud || [];

      for (const pc of pointClouds) {
        if (!pc.layers) continue;

        const layer = pc.layers.find(
          (l) => l.id === measurementId && l.type === "measurement"
        );

        if (layer) {
          updateMeasurementLayerFromPotree(potreeMeasurement, layer, pc.id);
          break; // Found the layer, no need to continue
        }
      }
    };

    const handleSetLookingModel = (event: any) => {
      lookingModel.current = event.type;
    };

    // Listen to event emitter for measurement finished events (primary method)
    if (window.eventBus) {
      window.eventBus.on("measurement-finished", handleMeasurementFinished);
      window.eventBus.on("markerMoved", handleMarkerMoved);
      window.eventBus.on("setLookingModel", handleSetLookingModel);
    }

    window.viewer.scene.addEventListener(
      "measurement_added",
      handleMeasurementAddedWithMarkerListener
    );
    window.viewer.scene.addEventListener(
      "measurement_removed",
      handleMeasurementRemoved
    );
    window.viewer.scene.addEventListener("marker_dropped", handleMarkerDropped);

    // No need to add marker listeners - we only save when measurement-finished event is emitted

    return () => {
      if (window.viewer && window.viewer.scene) {
        window.viewer.scene.removeEventListener(
          "measurement_added",
          handleMeasurementAddedWithMarkerListener
        );
        window.viewer.scene.removeEventListener(
          "measurement_removed",
          handleMeasurementRemoved
        );
        window.viewer.scene.removeEventListener(
          "marker_dropped",
          handleMarkerDropped
        );

        // Remove event emitter listener
        if (window.eventBus) {
          window.eventBus.off(
            "measurement-finished",
            handleMeasurementFinished
          );
          window.eventBus.off("markerMoved", handleMarkerMoved);
          window.eventBus.off("setLookingModel", handleSetLookingModel);
        }

        // Clear all pending timeouts
        pendingMeasurementsRef.current.forEach((timeout) => {
          clearTimeout(timeout);
        });
        pendingMeasurementsRef.current.clear();

        // Clear all marker moved debounce timeouts
        markerMovedDebounceRef.current.forEach((timeout) => {
          clearTimeout(timeout);
        });
        markerMovedDebounceRef.current.clear();
      }
    };
  }, [window.viewer, isPotreeReady, project?.metadata?.pointCloud, pointCloudData?.id]);

  // --- Point clouds & layers: load from project metadata; layers only for point clouds that are actually in the viewer ---
  useEffect(() => {
    if (!window.viewer || !isPotreeReady || !project?.metadata?.pointCloud) {
      return;
    }

    const pointClouds = project.metadata.pointCloud;
    const loadedPointCloudIds = new Set(
      window.viewer.scene.pointclouds.map((pc: any) => pc.name)
    );

    // Check if this is a new point cloud being added (count increased)
    const currentCount = pointClouds.length;
    const isNewPointCloud = currentCount > previousPointCloudCountRef.current;

    // Find newly added point cloud IDs (ones not in loadedPointCloudIds)
    const newPointCloudIds = pointClouds
      .filter((pc) => !loadedPointCloudIds.has(pc.id))
      .map((pc) => pc.id);

    // Async function to load point clouds with asset validation
    const loadPointClouds = async () => {
      let firstLoadedId: string | null = null;
      const loadedIds: string[] = [];

      // Check each point cloud in metadata
      // Use for...of loop to properly handle async operations
      for (const pc of pointClouds) {
        // Skip if already loaded
        if (loadedPointCloudIds.has(pc.id)) {
          // Update visibility for already loaded point clouds
          const existingPointCloud = window.viewer.scene.pointclouds.find(
            (p: any) => p.name === pc.id
          );
          if (existingPointCloud) {
            const shouldBeVisible = pc.visible !== false; // Default to true
            existingPointCloud._visible = shouldBeVisible;
          }
          continue;
        }

        // Skip if path or asset is empty
        if (!pc.path || !pc.asset) {
          console.warn(
            `Point cloud ${pc.id} has no path or asset, skipping load`
          );
          continue;
        }

        const project = ProjectActions.getProjectState();

        if (!project.project?.project.path) {
          continue;
        }

        const pointCloudPath = window.electronAPI.pathJoin(
          project.project?.project.path,
          pc.asset
        );

        // Verify asset exists before loading
        try {
          await window.electronAPI.readProjectXML(pointCloudPath);
          // Asset exists, load it
          loadPointCloud(pointCloudPath, pc.id);
          loadedIds.push(pc.id);

          // Track first loaded point cloud for initial focus
          if (!firstLoadedId) {
            firstLoadedId = pc.id;
          }
        } catch (error) {
          // console.warn(
          //   `Point cloud asset not found, skipping load: ${pointCloudPath}`
          // );
          // Asset doesn't exist, skip loading
          // Note: Invalid assets are already filtered in loadProject
        }
      }

      // Focus logic:
      // 1. If this is the first load and we loaded at least one point cloud, focus on the first one
      // 2. If a new point cloud was added, focus on the newly added one (last in newPointCloudIds)
      let focusId: string | null = null;

      if (isNewPointCloud && newPointCloudIds.length > 0) {
        // New point cloud added - focus on the last one (most recently added)
        const lastNewId = newPointCloudIds[newPointCloudIds.length - 1];
        if (loadedIds.includes(lastNewId)) {
          focusId = lastNewId;
        }
      } else if (isFirstLoadRef.current && firstLoadedId) {
        // First load - focus on the first point cloud
        focusId = firstLoadedId;
      }

      if (focusId) {
        setTimeout(() => {
          lookingModel.current = "point-cloud";
          PotreeService.focusToPointCloud(focusId!);
          // Track the focused point cloud as active (PotreeService also sets global variable)
          activePointCloudIdRef.current = focusId;
        }, 500); // Wait 1.5 seconds for point cloud to load
      }

      // Update refs
      if (isFirstLoadRef.current && firstLoadedId) {
        isFirstLoadRef.current = false;
      }
      previousPointCloudCountRef.current = currentCount;

      // Load measurement and annotation layers after point clouds are loaded
      setTimeout(() => {
        loadMeasurementLayers();
        loadAnnotationLayers();
      }, 1000); // Wait for point clouds to be fully loaded
    };

    /** Load measurement layers from Redux only for point clouds currently in the viewer (avoids orphan annotations/measurements). */
    const loadMeasurementLayers = () => {
      if (!window.viewer?.scene) return;

      const loadedPointCloudIds = new Set(
        window.viewer.scene.pointclouds.map((p: any) => p.name)
      );
      if (loadedPointCloudIds.size === 0) return;

      isLoadingMeasurementsRef.current = true;
      try {
        const currentProject = ProjectActions.getProjectState().project;
        const pointClouds = (currentProject?.metadata?.pointCloud || []).filter(
          (pc) => loadedPointCloudIds.has(pc.id)
        );

        // Collect all measurements from all point clouds
        const allMeasurements: any[] = [];

        for (const pc of pointClouds) {
          if (!pc.layers || pc.layers.length === 0) continue;

          // Get measurement layers for this point cloud
          const measurementLayers = pc.layers.filter(
            (layer) => layer.type === "measurement"
          );

          for (const layer of measurementLayers) {
            // Check if measurement already exists in viewer
            const existingMeasurement = window.viewer.scene.measurements.find(
              (m: any) => m.uuid === layer.id
            );

            if (existingMeasurement) {
              continue; // Skip if already loaded
            }

            // Create measurement data in the format expected by loadMeasurement
            // Use saved points if available, otherwise use extent
            const points =
              layer.points && layer.points.length > 0
                ? layer.points
                : [
                    [
                      layer.extent.min.x,
                      layer.extent.min.y,
                      layer.extent.min.z,
                    ],
                    [
                      layer.extent.max.x,
                      layer.extent.max.y,
                      layer.extent.max.z,
                    ],
                  ];

            const parentVisible = pc.visible !== false;
            const measurementData = {
              uuid: layer.id,
              name: layer.name,
              points: points,
              visible: parentVisible && (layer.visible !== false),
              showDistances:
                layer.showDistances ??
                (layer.measurementType === "line" ||
                  layer.measurementType === "polygon"),
              showCoordinates: layer.showCoordinates ?? false,
              showArea:
                layer.showArea ??
                (layer.measurementType === "area" ||
                  layer.measurementType === "polygon"),
              closed:
                layer.closed ??
                (layer.measurementType === "polygon" ||
                  layer.measurementType === "area"),
              showAngles: layer.showAngles ?? false,
              showHeight: layer.showHeight ?? false,
              showCircle: layer.showCircle ?? false,
              showAzimuth: layer.showAzimuth ?? false,
              showEdges: layer.showEdges ?? true,
              color: layer.color ?? [1, 1, 0], // Use saved color or default yellow
              icon: layer.icon, // Icon path if available
            };

            allMeasurements.push(measurementData);
          }
        }

        // Load all measurements using loadMeasurement function (like the example code)
        if (typeof (window as any).loadMeasurement === "function") {
          for (const measure of allMeasurements) {
            try {
              (window as any).loadMeasurement(window.viewer, measure);

              // Set color if available (loadMeasurement doesn't set color)
              const loadedMeasure = window.viewer.scene.measurements.find(
                (m: any) => m.uuid === measure.uuid
              );
              if (loadedMeasure && measure.color && measure.color.length >= 3) {
                loadedMeasure.color = new window.THREE.Color(
                  measure.color[0],
                  measure.color[1],
                  measure.color[2]
                );
              }
            } catch (error) {
              console.error(
                `Error loading measurement ${measure.uuid}:`,
                error
              );
            }
          }
        } else {
          // Fallback: create measurements manually
          const Measure = window.Potree.Measure;
          const Vector3 = window.THREE.Vector3;

          for (const measurementData of allMeasurements) {
            try {
              // Check for duplicate
              const duplicate = window.viewer.scene.measurements.find(
                (m: any) => m.uuid === measurementData.uuid
              );
              if (duplicate) {
                continue; // Skip if already exists
              }

              const measure = new Measure();
              measure.uuid = measurementData.uuid;
              measure.name = measurementData.name;
              measure.showDistances = measurementData.showDistances;
              measure.showCoordinates = measurementData.showCoordinates;
              measure.showArea = measurementData.showArea;
              measure.closed = measurementData.closed;
              measure.showAngles = measurementData.showAngles;
              measure.showHeight = measurementData.showHeight;
              measure.showCircle = measurementData.showCircle;
              measure.showAzimuth = measurementData.showAzimuth;
              measure.showEdges = measurementData.showEdges;
              measure.visible = measurementData.visible;

              // Add points
              measurementData.points.forEach((point: number[]) => {
                const pos = new Vector3(point[0], point[1], point[2]);
                measure.addMarker(pos);
              });

              // Set color if available
              if (measurementData.color && measurementData.color.length >= 3) {
                measure.color = new window.THREE.Color(
                  measurementData.color[0],
                  measurementData.color[1],
                  measurementData.color[2]
                );
              }

              window.viewer.scene.addMeasurement(measure);
            } catch (error) {
              console.error(
                `Error loading measurement ${measurementData.uuid}:`,
                error
              );
            }
          }
        }
      } finally {
        // Reset flag after loading is complete
        isLoadingMeasurementsRef.current = false;
      }
    };

    /** Load annotation layers from Redux only for point clouds currently in the viewer. */
    const loadAnnotationLayers = () => {
      if (!window.viewer?.scene) return;
      const loadAnnotationsFn = (window as any).Potree?.loadAnnotations;
      if (typeof loadAnnotationsFn !== "function") return;

      const loadedPointCloudIds = new Set(
        window.viewer.scene.pointclouds.map((p: any) => p.name)
      );
      if (loadedPointCloudIds.size === 0) return;

      const currentProject = ProjectActions.getProjectState().project;
      const pointClouds = (currentProject?.metadata?.pointCloud || []).filter(
        (pc) => loadedPointCloudIds.has(pc.id)
      );
      const allAnnotations: Array<{
        position: number[];
        title: string;
        description: string;
        uuid: string;
        visible: boolean;
        offset?: number[];
        children?: unknown[];
      }> = [];

      for (const pc of pointClouds) {
        if (!pc.layers || pc.layers.length === 0) continue;

        const annotationLayers = pc.layers.filter(
          (layer) => layer.type === "annotation"
        );

        const parentVisible = pc.visible !== false;
        for (const layer of annotationLayers) {
          const ann = layer as { position: [number, number, number]; title: string; content?: string; id: string; visible: boolean };
          allAnnotations.push({
            position: [...ann.position],
            title: ann.title,
            description: ann.content ?? "",
            visible: parentVisible && (ann.visible ?? true),
            uuid: ann.id,
            offset: [0, 0, 0],
            children: [],
          });
        }
      }

      if (allAnnotations.length > 0) {
        loadAnnotationsFn(window.viewer, allAnnotations);
      }
    };

    loadPointClouds();
  }, [project?.metadata?.pointCloud, isPotreeReady]);

  // Load mesh function - copied from Viewer3D.tsx and adapted
  const loadMesh = useCallback(
    async (id: string, wireframe?: boolean) => {
      if (!window.viewer) {
        console.warn("Viewer not ready");
        return;
      }

      try {
        // Dronet projesinde loadMesh başında earthControls set ediliyor
        window.viewer.setControls(window.viewer.earthControls);

        const project = ProjectActions.getProjectState();
        if (!project.project) {
          console.error("No project loaded");
          return;
        }

        // Find mesh by ID
        const meshData = project.project.metadata.mesh.find((m) => m.id === id);
        if (!meshData) {
          console.error(`Mesh with ID ${id} not found`);
          return;
        }

        const projectPath = project.project.project.path;
        // Get directory path from mesh path (remove filename)
        // meshData.path is like: "import/mesh/{meshId}/{fileName}.obj"
        // We need: projectPath + "/" + "import/mesh/{meshId}/"
        const meshPathParts = meshData.path.split(/[\\/]/);
        meshPathParts.pop(); // Remove filename
        const meshDirPath = meshPathParts.join("/");

        // Use pathJoin to properly combine paths (Windows backslash format)
        const fullMeshDirPath = window.electronAPI.pathJoin(
          projectPath,
          meshDirPath
        );

        // Convert Windows path to forward slashes for Three.js loaders
        // Windows paths like "D:\path" should become "D:/path"
        let meshPath = fullMeshDirPath.replace(/\\/g, "/");

        // Remove leading slash if it exists (Windows paths shouldn't start with /)
        // E.g., "/D:/path" -> "D:/path"
        if (meshPath.match(/^\/[A-Z]:/i)) {
          meshPath = meshPath.substring(1);
        }

        // Ensure path ends with forward slash
        if (!meshPath.endsWith("/")) {
          meshPath = meshPath + "/";
        }

        const result = await new Promise((resolve) => {
          const manager = new window.THREE.LoadingManager();
          manager.onProgress = function (
            url: any,
            itemsLoaded: any,
            itemsTotal: any
          ) {
            const percentComplete = (itemsLoaded / itemsTotal) * 100;
            requestAnimationFrame(() => {
              if (percentComplete >= 100) {
                // Loading complete - could show loading indicator here
                return;
              }
              // Could show progress here
            });
          };

          manager.addHandler(
            /\.(png|jpg|bmp|jpeg)$/i,
            new window.THREE.TextureLoader()
          );

          const mtlFileName = meshData.asset.split(/[\\/]/).pop() || "";
          const objFileName = meshData.path.split(/[\\/]/).pop() || "";

          // Log path for debugging
          console.log("Mesh path for loaders:", meshPath);

          const mtlLoader = new window.THREE.MTLLoader(manager);
          mtlLoader.setPath(meshPath);
          if (mtlLoader.setResourcePath) {
            mtlLoader.setResourcePath(meshPath);
          }
          mtlLoader.load(
            mtlFileName,
            function (materials: any) {
              //materials.preload(); // Dronet'te yorum satırında
              new window.THREE.OBJLoader(manager)
                .setMaterials(materials)
                .setPath(meshPath)
                .load(
                  objFileName,
                  function (object: any) {
                    object.translateX(meshData.center.x);
                    object.translateY(meshData.center.y);
                    object.modelType = meshData.fileType;
                    object.name = id;

                    console.log("Mesh object loaded:", {
                      name: object.name,
                      childrenCount: object.children.length,
                      hasFirstChild: !!object.children[0],
                      firstChildType: object.children[0]?.type,
                      firstChildMaterial: object.children[0]?.material,
                    });

                    if (!object.children || object.children.length === 0) {
                      console.error("Mesh object has no children!");
                      resolve(false);
                      return;
                    }

                    if (!object.children[0]) {
                      console.error("Mesh object's first child is undefined!");
                      resolve(false);
                      return;
                    }

                    if (Array.isArray(object.children[0].material)) {
                      for (
                        let i = 0;
                        i < object.children[0].material.length;
                        i++
                      ) {
                        const oldMat = object.children[0].material[i];
                        // Always create new MeshBasicMaterial (Dronet style)
                        // Material'ler MaterialCreator'dan geliyor, direkt değiştiriyoruz
                        object.children[0].material[i] =
                          new window.THREE.MeshBasicMaterial({
                            color:
                              oldMat && oldMat.color ? oldMat.color : 0xffffff,
                            map: oldMat && oldMat.map ? oldMat.map : null,
                            side: window.THREE.DoubleSide,
                            transparent: oldMat && oldMat.map ? true : false,
                          });
                        object.children[0].material.name = id;
                        object.children[0].name = id; 
                      }
                    } else {
                      const oldMat = object.children[0].material;
                      // Always create new MeshBasicMaterial (Dronet style)
                      object.children[0].material =
                        new window.THREE.MeshBasicMaterial({
                          color:
                            oldMat && oldMat.color ? oldMat.color : 0xffffff,
                          map: oldMat && oldMat.map ? oldMat.map : null,
                          wireframe: wireframe,
                          side: window.THREE.DoubleSide,
                          transparent: oldMat && oldMat.map ? true : false,
                        });
                      object.children[0].name = id;
                    }

                    object.traverse((child: any) => {
                      if (child.isMesh) {
                        // Ensure material is set for all mesh children
                        if (
                          !child.material ||
                          (Array.isArray(child.material) &&
                            child.material.length === 0)
                        ) {
                          child.material = new window.THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            side: window.THREE.DoubleSide,
                          });
                        } else if (Array.isArray(child.material)) {
                          // Ensure all materials in array are valid
                          for (let i = 0; i < child.material.length; i++) {
                            if (
                              !child.material[i] ||
                              !child.material[i].isMaterial
                            ) {
                              child.material[i] =
                                new window.THREE.MeshBasicMaterial({
                                  color: 0xffffff,
                                  side: window.THREE.DoubleSide,
                                });
                            }
                          }
                        } else if (!child.material.isMaterial) {
                          // Material exists but not valid, replace it
                          child.material = new window.THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            side: window.THREE.DoubleSide,
                          });
                        }

                        child.geometry.boundsTree = new MeshBVH(
                          child.geometry,
                          {
                            strategy: CENTER,
                            maxLeafTris: 10,
                            maxDepth: 25,
                          }
                        );
                        child.geometry.attributes.position.updateRange = {
                          offset: 0,
                          count: -1,
                        };
                        child.geometry.computeVertexNormals();
                        child.name = id;
                      }
                    });

                    window.viewer.scene.scene.add(object);

                    // Mesh eklendikten sonra kontrolleri tekrar ayarla (point cloud gibi)
                    window.viewer.setControls(window.viewer.earthControls);

                    setTimeout(function () {
                      PotreeService.focusToMesh(id);
                      lookingModel.current = "mesh-model";
                    }, 500);
                  },
                  undefined,
                  function () {
                    resolve(false);
                  }
                );
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            function () {},
            function () {
              resolve(false);
            }
          );

          resolve(true);
        });

        return result;
      } catch (error) {
        console.error(error);
        return null;
      }
    },
    [project]
  );

  // Load meshes automatically when mesh metadata changes
  useEffect(() => {
    if (!isPotreeReady || !window.viewer) {
      return;
    }

    const loadMeshes = async () => {
      const meshes = project?.metadata?.mesh || [];
      if (meshes.length === 0) {
        return;
      }

      for (const mesh of meshes) {
        // Check if mesh is already loaded in scene
        const objects = window.viewer.scene.scene.children;
        const meshExists = objects.some(
          (obj: any) => obj.name === mesh.id && obj.modelType === "mesh"
        );

        if (!meshExists) {
          // Mesh not loaded yet, load it
          await loadMesh(mesh.id);
        }
      }
    };

    // loadMeshes();
  }, [project?.metadata?.mesh, isPotreeReady]);

  const potreeOnMouseMove = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (lookingModel.current == "point-cloud") {
      const { clientX, clientY } = event;
      const now = Date.now();

      // 1. MİKTAR KONTROLÜ (Distance Threshold):
      // Fare 5 pikselden az hareket ettiyse ağır hesaplamaya HİÇ girme.
      const dist = Math.sqrt(
        Math.pow(clientX - lastX.current, 2) +
          Math.pow(clientY - lastY.current, 2)
      );
      if (dist < 3) return;

      // 2. ZAMAN KONTROLÜ (Throttle):
      // Saniyede maksimum 20-25 kez çalışmasına izin ver (40-50ms).
      if (now - lastCallTime.current < 65) return;

      // Durum kontrolleri
      if (isMouseWheelHeld || isObjectMoving) return;
      const pointCloudsArray = window.viewer?.scene?.pointclouds;
      if (!pointCloudsArray || pointCloudsArray.length === 0) return;

      // Değerleri güncelle
      lastX.current = clientX;
      lastY.current = clientY;
      lastCallTime.current = now;

      // 3. ASIL HESAPLAMA (Ağır İşlem)
      try {
        const resultPc = await PointCloudService.mouseCoordListener(
          event.nativeEvent,
          pointCloudsArray
        );

        if (
          resultPc?.point?.position &&
          resultPc.point.position.x !== -1 &&
          project
        ) {
          const pos = resultPc.point.position;
          const pointCloud = project.metadata.pointCloud.find(
            (pc) => pc.id == resultPc.pointCloudId
          );
          if (pointCloud && intersectedPointCloud.current != pointCloud.id) {
            intersectedPointCloud.current = pointCloud.id;
            StatusBarActions.setModelData(
              pointCloud?.id,
              pointCloud?.name,
              pointCloud?.epsg
            );
          }
          StatusBarActions.setCoordinates(
            Number(pos.x.toFixed(3)),
            Number(pos.y.toFixed(3)),
            Number(pos.z.toFixed(3))
          );
        } else {
          StatusBarActions.clearCoords();
        }
      } catch (e) {
        // Hata durumunda sessizce fail ol (FPS'i korumak için)
      }
    } else if (lookingModel.current == "mesh-model" && project) {
      const { clientX, clientY } = event;
      const now = Date.now();

      // 1. MİKTAR KONTROLÜ (Distance Threshold):
      // Fare 5 pikselden az hareket ettiyse ağır hesaplamaya HİÇ girme.
      const dist = Math.sqrt(
        Math.pow(clientX - lastX.current, 2) +
          Math.pow(clientY - lastY.current, 2)
      );
      if (dist < 3) return;

      // 2. ZAMAN KONTROLÜ (Throttle):
      // Saniyede maksimum 20-25 kez çalışmasına izin ver (40-50ms).
      if (now - lastCallTime.current < 65) return;

      // Durum kontrolleri
      if (isMouseWheelHeld || isObjectMoving) return;

      // Değerleri güncelle
      lastX.current = clientX;
      lastY.current = clientY;
      lastCallTime.current = now;

      // 3. ASIL HESAPLAMA (Ağır İşlem) - Point cloud gibi throttle ile
      try {
        const resultMesh = await MeshService.mouseCoordListener(
          event.nativeEvent
        );

        if (
          resultMesh?.point?.position &&
          resultMesh.point.position.x !== -1
        ) {
          // console.error(resultMesh);
          const meshModel = project.metadata.mesh.find(
            (mesh) => mesh.id == resultMesh.id
        );

        // console.error(meshModel)

        if (meshModel && intersectedMeshModel.current != meshModel.id) {
            intersectedMeshModel.current = meshModel.id;
            StatusBarActions.setModelData(
              meshModel?.id,
              meshModel?.name,
              meshModel?.epsg
            );
          }

          StatusBarActions.setCoordinates(
            Number(resultMesh.point.position.x.toFixed(2)),
            Number(resultMesh.point.position.y.toFixed(2)),
            Number(resultMesh.point.position.z.toFixed(2))
          );
        } else {
          StatusBarActions.clearCoords();
        }
      } catch (e) {
        // Hata durumunda sessizce fail ol (FPS'i korumak için)
      }
    }
  };

  // Potree hazır olana kadar loading göster
  if (!isPotreeReady) {
    return (
      <div
        id="viewerContainer"
        style={{
          display: "flex",
          margin: 0,
          padding: 0,
          width: "100%",
          height: "100%",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#fff", fontSize: "16px" }}>Viewer Loading</div>
      </div>
    );
  }

  // display: none yerine visibility ve opacity kullan (WebGL context kaybını önlemek için)
  // Viewer.tsx'de visibility kontrolü yapılıyor, burada her zaman visible olmalı
  const isVisible = display === "block";

  return (
    <div
      id="main-potree"
      style={{
        visibility: "visible", // Viewer.tsx'de kontrol ediliyor
        opacity: 1, // Viewer.tsx'de kontrol ediliyor
        pointerEvents: "auto", // Viewer.tsx wrapper'da kontrol ediliyor, burada her zaman auto
        width: "100%",
        height: "100%",
        transition: "opacity 0.2s",
      }}
    >
      <div
        id="viewerContainer"
        style={{
          display: "block",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 0,
          width: "100%",
          height: "100%",
          position: "relative",
          pointerEvents: "auto", // Viewer.tsx wrapper'da kontrol ediliyor, burada her zaman auto
        }}
      >
        {/* Settings Button - Sol üst köşe */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 50,
            pointerEvents: "auto",
          }}
        >
          <div style={{ position: "relative" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
              className="h-8 w-8 p-0 bg-[#262626] border-[#404040] hover:bg-[#404040] hover:border-[#505050]"
              title="Viewer Settings"
            >
              <MonitorCog className="h-4 w-4 text-[#e5e5e5]" />
            </Button>

            {/* Settings Panel */}
            <PotreeViewerSettingsPanel
              open={settingsPanelOpen}
              onClose={() => setSettingsPanelOpen(false)}
            />
          </div>
        </div>

        {/* 3D FPS Meter - Sağ üst köşe */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 50, // Viewer içindeki UI elementleri
            pointerEvents: "none", // Container pointer events'i engellemez
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "flex-end",
          }}
        >
          <Compass className="pointer-events-auto" />
          <FPSMeter className="pointer-events-auto" />
        </div>

        {/* Orbit Controller - Sol alt köşe */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            zIndex: 50, // Viewer içindeki UI elementleri
            pointerEvents: "auto", // OrbitController çalışmalı
          }}
        >
          <OrbitController />
        </div>

        <div
          id="potree_container"
          style={{
            width: "100%",
            marginTop: "0px",
            height: "100%",
            minWidth: "200px",
            minHeight: "200px",
            pointerEvents: "auto", // Viewer.tsx wrapper'da kontrol ediliyor, burada her zaman auto
          }}
        >
          <div
            id="potree_render_area"
            onMouseMove={potreeOnMouseMove}
            style={{
              width: "100%",
              height: "100%",
              minWidth: "200px",
              minHeight: "200px",
              pointerEvents: "auto", // Canvas etkileşimleri için
            }}
            ref={potreeRenderAreaRef}
          ></div>
          <div
            id="potree_sidebar_container"
            style={{
              width: "100%",
              // height: `calc(100% - (${
              //   multiTabScreen.show ? "300px" : "0px"
              // }))`,
              height: "100%",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default PotreeViewer;
