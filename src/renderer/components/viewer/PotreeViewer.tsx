import React, { useEffect } from "react";
import PointCloudService from "../../services/PointCloudService";
import StatusBarActions from "../../store/actions/StatusBarActions";
import PotreeService from "../../services/PotreeService";
import PotreeBackgroundService from "../../services/PotreeBackgroundService";
import FPSMeter from "../FPSMeter";

const PotreeViewer: React.FC<{ display: string }> = ({ display }) => {
  const potreeRenderAreaRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLElement | null>(null);
  const [isMouseWheelHeld, setIsMouseWheelHeld] = React.useState(false);
  const [isObjectMoving, setIsObjectMoving] = React.useState(false);
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

  useEffect(() => {
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
  }, []);

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

        loadPointCloud("C:\\Users\\bugra.cimen\\Desktop\\rotgis-desktop\\test_data\\metadata.json", "pc");
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

        //   PotreeService.zoomToBBox("pc");
        });
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
  return (
    <div id="viewerContainer" style={{display:"flex", margin:0, padding:0, width:"100%", height:"100%", position: "relative"}}>
      {/* 3D FPS Meter - Sağ üst köşe */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 10000,
          pointerEvents: "none",
        }}
      >
        <FPSMeter className="pointer-events-auto" />
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
          {" "}
        </div>
      </div>
    </div>
  );
};

export default PotreeViewer;
