import React, { useEffect } from "react";
import { WindowCustomBar } from "../WindowCustomBar";
import PotreeViewer from "../viewer/PotreeViewer";
import HeightProfileViewer from "../viewer/HeightProfileViewer";
import StatusBar from "../StatusBar";
import RibbonMenu from "../menu/RibbonMenu";
import Tools from "../tools/ToolBox";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../ui/resizable";


const useStyles = {
  container: {},
};

function Main() {
  const styles = useStyles;
  const [viewer, setViewer] = React.useState<any>(true);

  useEffect(() => {
    console.error("loaded", window.viewer);
  }, [window.viewer]);

  return (
    <div style={styles.container}>
      <WindowCustomBar />
      <RibbonMenu />
      <ResizablePanelGroup
        direction="horizontal"
        style={{
          height: "calc(100vh - 202px)",
          width: "100vw",
        }}
      >
        <ResizablePanel
          defaultSize={325}
          minSize={100}
          maxSize={400}
          style={{ minWidth: "100px", maxWidth: "400px" }}
        >
          <Tools />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75} minSize={30}>
          <div
            style={{
              height: "calc(100vh - 202px)",
              width: "100%",
              position: "relative",
            }}
          >
            {viewer && <PotreeViewer display="block" />}
            {<HeightProfileViewer display="none" />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <StatusBar />
    </div>
  );
}

export default Main;
