import React, { useEffect } from "react";
import PointCloudService from "../../services/PointCloudService";
import StatusBarActions from "../../store/actions/StatusBarActions";

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
  }

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
      const oldCanvas = window.viewer.renderer?.domElement;
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
      const viewerArgs = {
        noDragAndDrop: true,
        useDefaultRenderLoop: false,
      };
      window.pointSizeType = 1;
      window.viewer = new window.Potree.Viewer(elRenderArea, viewerArgs);
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

        const dronetCanvas = document.getElementById("dronet-viewer-canvas");
        canvasRef.current = dronetCanvas ? dronetCanvas : null;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.addEventListener("webglcontextlost", handleContextLost, false);
          canvas.addEventListener(
            "webglcontextrestored",
            handleContextRestored,
            false
          );
        }
      });
    } catch (error) {
      console.error(error);
      return;
    }
  };

  const potreeOnMouseMove = async (event: any) => {
    if (!isMouseWheelHeld && !isObjectMoving) {
      let debounceTimeout: any;
      const DEBOUNCE_DELAY = 1;
      //   switch (activeModel.type) {
      //     case "mesh": {
      //       if (!debounceTimeout) {
      //         // Set a new timeout to call the mouseCoordListener after the delay
      //         debounceTimeout = setTimeout(async () => {
      //           const resultMesh = await MeshModelManager.mouseCoordListener(
      //             event
      //           );

      //           if (resultMesh.point.position.x == -1) {
      //             StatusBarActions.clearCoords();
      //             return;
      //           }

      //           StatusBarActions.updateProjectCoords(
      //             resultMesh.point.position.x.toFixed(2) +
      //               " , " +
      //               resultMesh.point.position.y.toFixed(2) +
      //               " , " +
      //               resultMesh.point.position.z.toFixed(2)
      //           );

      //           // Clear the previous timeout if a new mouse move is detected before the delay
      //           clearTimeout(debounceTimeout);
      //           debounceTimeout = null;
      //         }, DEBOUNCE_DELAY);
      //       }
      //       break;
      //     }
      //     case "pc": {
      if (window.viewer) {
        const pointClouds = window.viewer.scene.pointclouds;
        const resultPc = await PointCloudService.mouseCoordListener(
          event,
          pointClouds
        );
        if (resultPc.point.position.x == -1) {
          StatusBarActions.clearCoords();
          return;
        }
        StatusBarActions.setCoordinates(
          Number(resultPc.point.position.x.toFixed(2)),
          Number(resultPc.point.position.y.toFixed(2)),
          Number(resultPc.point.position.z.toFixed(2))
        );
        // break;
      }
      //     }
      //   }
    }
  };
  return (
    <div id="viewerContainer">
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
