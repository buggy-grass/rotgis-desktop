import React, { useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
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
  const handleContextLostRef = React.useRef<((event: Event) => Promise<void>) | null>(null);
  const handleContextRestoredRef = React.useRef<(() => Promise<void>) | null>(null);

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

  const handleContextLost = useCallback(async (event: Event) => {
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
  }, [clear]);

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

        const rotgisCanvas = document.getElementById("rotgis-canvas");
        canvasRef.current = rotgisCanvas ? rotgisCanvas : null;
        const canvas = canvasRef.current;
        if (canvas) {
          if (handleContextLostRef.current) {
            canvas.addEventListener("webglcontextlost", handleContextLostRef.current, false);
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
        const syntheticEvent = new Event('webglcontextlost');
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
      const material = e.pointcloud.material;
      material.size = 1;
      // material.pointSizeType = window.Potree.PointSizeType.ATTENUATED;
      // material.pointSizeType = window.Potree.PointSizeType.ADAPTIVE;
      //   material.heightMin = pointCloud.properties.bbox.min.z;
      //   material.heightMax = pointCloud.properties.bbox.max.z;
      material.pointSizeType = window.pointSizeType;
      //PointCloudManager.setPointBudget(5000000);
      PotreeService.setNodeSize(30);
      material.coloringType = 0;
      material.gradientValue = "SPECTRAL";
      window.viewer.setControls(window.viewer.earthControls);

      // Set visibility from Redux store
      const projectState = ProjectActions.getProjectState();
      const pointCloudMetadata = projectState.project?.metadata?.pointCloud?.find((pc) => pc.id === id);
      if (pointCloudMetadata) {
        const shouldBeVisible = pointCloudMetadata.visible !== false; // Default to true
        e.pointcloud._visible = shouldBeVisible;
        console.log(`Point cloud ${id} loaded with visibility: ${shouldBeVisible}`);
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
  const project = useSelector((state: RootState) => state.projectReducer.project);

  // Track if this is the first load (for initial focus)
  const isFirstLoadRef = React.useRef(true);
  const previousPointCloudCountRef = React.useRef(0);

  // Load point clouds from project metadata when store updates
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
      .filter(pc => !loadedPointCloudIds.has(pc.id))
      .map(pc => pc.id);

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
          const existingPointCloud = window.viewer.scene.pointclouds.find((p: any) => p.name === pc.id);
          if (existingPointCloud) {
            const shouldBeVisible = pc.visible !== false; // Default to true
            existingPointCloud._visible = shouldBeVisible;
          }
          continue;
        }

        // Skip if path or asset is empty
        if (!pc.path || !pc.asset) {
          console.warn(`Point cloud ${pc.id} has no path or asset, skipping load`);
          continue;
        }

        const project = ProjectActions.getProjectState();
        
        if(!project.project?.project.path){
          continue;
        }

        const pointCloudPath = window.electronAPI.pathJoin(project.project?.project.path, pc.asset);
        
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
          console.warn(`Point cloud asset not found, skipping load: ${pointCloudPath}`);
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
        // Wait a bit for the point cloud to be fully loaded in Potree
        setTimeout(() => {
          console.log(`Focusing on point cloud: ${focusId}`);
          PotreeService.focusToPointCloud(focusId!);
        }, 500); // Wait 1.5 seconds for point cloud to load
      }

      // Update refs
      if (isFirstLoadRef.current && firstLoadedId) {
        isFirstLoadRef.current = false;
      }
      previousPointCloudCountRef.current = currentCount;
    };

    loadPointClouds();
  }, [project?.metadata?.pointCloud, isPotreeReady]);

  const potreeOnMouseMove = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseWheelHeld && !isObjectMoving) {
      if (
        window.viewer &&
        window.viewer.scene &&
        window.viewer.scene.pointclouds
      ) {
        const pointCloudsArray = window.viewer.scene.pointclouds;

        // Point cloud kontrolü - eğer pointclouds boşsa işlemi sonlandır
        if (!pointCloudsArray || pointCloudsArray.length === 0) {
          StatusBarActions.clearCoords();
          return;
        }

        // Native event'i kullanarak daha hassas koordinat hesaplama
        const nativeEvent = event.nativeEvent;

        // getMousePointCloudIntersection bir array bekliyor, bu yüzden tüm pointclouds array'ini gönderiyoruz
        const resultPc = await PointCloudService.mouseCoordListener(
          nativeEvent,
          pointCloudsArray
        );

        if (resultPc.point.position.x == -1) {
          StatusBarActions.clearCoords();
          return;
        }

        // Daha hassas koordinat gösterimi (3 ondalık basamak)
        StatusBarActions.setCoordinates(
          Number(resultPc.point.position.x.toFixed(3)),
          Number(resultPc.point.position.y.toFixed(3)),
          Number(resultPc.point.position.z.toFixed(3))
        );
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
