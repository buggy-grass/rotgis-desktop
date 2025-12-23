import React, { useEffect } from "react";
import PointCloudService from "../../services/PointCloudService";
import StatusBarActions from "../../store/actions/StatusBarActions";
import PotreeService from "../../services/PotreeService";
import PotreeBackgroundService from "../../services/PotreeBackgroundService";
import FPSMeter from "../FPSMeter";
import Compass from "../Compass";
import OrbitController from "../OrbitController";
import "../../services/EventEmitter";

const PotreeViewer: React.FC<{ display: string }> = ({ display }) => {
  const potreeRenderAreaRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLElement | null>(null);
  const [isMouseWheelHeld, setIsMouseWheelHeld] = React.useState(false);
  const [isObjectMoving, setIsObjectMoving] = React.useState(false);
  const [isPotreeReady, setIsPotreeReady] = React.useState(false);
  const webGLContextLost = React.useRef(false);

  const handleContextLost = async (event: Event) => {
    event.preventDefault(); // 🔴 En önemli satır bu
    // console.warn("WebGL context LOST");

    webGLContextLost.current = true; // UI'ı güncelle
    // console.error("Context Lost Gerçekleşti");
    await clear();
    window.viewer?.renderer?.dispose();
    window.viewer?.scene?.scene?.dispose();
    const oldCanvas = window.viewer?.renderer?.domElement;
    oldCanvas?.remove();

    setTimeout(() => {
      handleContextRestored();
    }, 100);
    // viewer.scene.dispose() vs. gibi temizleme yapılabilir
  };

  const clear = async () => {
    await PointCloudService.removePointClouds();
  };

  const handleContextRestored = async () => {
    // console.log("WebGL context RESTORED");

    webGLContextLost.current = false;
    if (potreeRenderAreaRef && potreeRenderAreaRef.current) {
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
      potreeRenderAreaRef.current.innerHTML = "";

      //   setOrbitControllerKey((prev) => prev + 1);
      await loadViewer();
      //   ToolsActions.firstLoad(true);
      //   LeftMenuActions.setSelectedMenu("");
      //   setTimeout(() => {
      //     LeftMenuActions.setSelectedMenu("3d");
      //   }, 10);
    }
  };

  // Potree'nin yüklenmesini bekle
  useEffect(() => {
    const checkPotreeReady = () => {
      if (typeof window.Potree !== 'undefined' || (window as any).potreeReady) {
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

    window.addEventListener('potreeReady', handlePotreeReady);

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
        console.error('❌ Potree yüklenemedi - timeout');
      }
    }, 10000);

    return () => {
      window.removeEventListener('potreeReady', handlePotreeReady);
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isPotreeReady]);

  // Potree hazır olduğunda viewer'ı yükle
  useEffect(() => {
    if (!isPotreeReady) {
      return;
    }

    const loadPotreeViewer = async () => {
      await loadViewer();
    };

    loadPotreeViewer();

    return () => {
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
      clear();
      window.viewer?.renderer?.dispose();
      window.viewer?.scene?.scene?.dispose();
      const oldCanvas = window.viewer?.renderer?.domElement;
      oldCanvas?.remove();
    };
  }, [isPotreeReady]);

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

  const loadViewer = async () => {
    try {
      // Potree'nin yüklü olduğundan emin ol
      if (typeof window.Potree === 'undefined') {
        console.error('Potree is not loaded yet');
        return;
      }

      if (window.viewer) {
        window.viewer = null;
      }
      const elRenderArea = document.getElementById("potree_render_area");

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
      

    //   window.viewer.renderer.setClearColor(0x1f1f1f, 1);
      // window.viewer.setEDLEnabled(true);
      // window.viewer.setFOV(60);
      // window.viewer.setPointBudget(5 * 1000 * 1000);
      // window.viewer.setMinNodeSize(0);
      // window.viewer.loadSettingsFromURL();
      // window.viewer.setDescription("");

      window.viewer.loadGUI(async () => {
        // await loadViewerContainer();
        // window.viewer.setLanguage('en');
        // window.viewer.toggleSidebar();
        if (!window.viewer.profileWindowController) {
          window.eventBus.emit("heightProfileLoad", {
            viewer: window.viewer,
          });
        }
        // window.viewer?.addEventListener("update", CadGeneralManager.update);

        const rotgisCanvas = document.getElementById("rotgis-canvas");
        canvasRef.current = rotgisCanvas ? rotgisCanvas : null;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.addEventListener("webglcontextlost", handleContextLost, false);
          canvas.addEventListener(
            "webglcontextrestored",
            handleContextRestored,
            false
          );
        }

        // Gradient-grid background modunu ekle
        PotreeBackgroundService.setupGradientGridBackground(window.viewer);

        // const exist = fs.existsSync("C:\\Users\\bugra.cimen\\Desktop\\bugra\\rotgis-desktop\\test_data\\metadata.json");
        loadPointCloud("C:\\Users\\bugra.cimen\\Desktop\\bugra\\rotgis-desktop\\test_data\\metadata.json", "pc");
        window.viewer.renderer.setClearColor(0x1f1f1f, 1);
        // Gradient-grid background'u aktif et
        window.viewer.setBackground("gradient-grid");
      
      });
    } catch (error) {
      console.error(error);
      return;
    }
  };

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

          window.viewer.zoomTo(e.pointcloud, 1.2);
          
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
        if (typeof view.yaw !== 'undefined') {
          // Sadece belirli bir eşik değerinden fazla değiştiyse emit et
          if (lastYaw === null || Math.abs(view.yaw - lastYaw) > THRESHOLD) {
            lastYaw = view.yaw;
            
            // Yaw'ı dereceye çevir (0-360 arası)
            let yawDegrees = (view.yaw * 180) / Math.PI;
            yawDegrees = yawDegrees % 360;
            if (yawDegrees < 0) yawDegrees += 360;
            
            // Pitch'i dereceye çevir
            const pitchDegrees = typeof view.pitch !== 'undefined' 
              ? (view.pitch * 180) / Math.PI 
              : 0;
            
            // EventEmitter'a emit et (hem yaw hem pitch)
            if (window.eventBus) {
              window.eventBus.emit('camera-rotation-changed', { 
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
    viewer.addEventListener('update', checkRotationChange);
  };

  const potreeOnMouseMove = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseWheelHeld && !isObjectMoving) {
      if (window.viewer && window.viewer.scene && window.viewer.scene.pointclouds) {
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
      <div id="viewerContainer" style={{display:"flex", margin:0, padding:0, width:"100%", height:"100%", position: "relative", alignItems: "center", justifyContent: "center"}}>
        <div style={{color: "#fff", fontSize: "16px"}}>Viewer Loading</div>
      </div>
    );
  }

  return (
    <div id="viewerContainer" style={{display:"flex", margin:0, padding:0, zIndex: 9994, width:"100%", height:"100%", position: "relative"}}>
      {/* 3D FPS Meter - Sağ üst köşe */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 10000,
          pointerEvents: "none",
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
          zIndex: 10000,
          pointerEvents: "auto",
        }}
      >
        <OrbitController />
      </div>
      
      <div
        id="potree_container"
        style={{
          width: "100%",
          marginTop: "0px",
          //   height: `calc(100% - (${multiTabScreen.show ? "0px" : "0px"}))`,
          height: "100%",
          zIndex: 9994,
        }}
      >
        <div
          id="potree_render_area"
          onMouseMove={potreeOnMouseMove}
          style={{
            width: "100%",
            // height: `calc(100% - (${
            //   multiTabScreen.show ? "300px" : "0px"
            // }))`,
            height: "100%",
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
        >
        </div>
      </div>
    </div>
  );
};

export default PotreeViewer;
