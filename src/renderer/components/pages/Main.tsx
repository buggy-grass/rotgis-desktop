import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { WindowCustomBar } from "../WindowCustomBar";
import Viewer from "../viewer/Viewer";
import HeightProfileViewer from "../viewer/HeightProfileViewer";
import StatusBar from "../StatusBar";
import RibbonMenu from "../menu/RibbonMenu";
import Toolbox from "../tools/ToolBox";
import SettingsPage from "./SettingsPage";
import { RootState } from "../../store/store";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../ui/resizable";

type ViewMode = "3d" | "2d" | "split-horizontal";

const useStyles = {
  container: {},
};

function Main() {
  const styles = useStyles;
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const isSettingsOpen = useSelector(
    (state: RootState) => state.settingsReducer.isSettingsOpen
  );

  useEffect(() => {
    console.error("loaded", window.viewer);
  }, [window.viewer]);

  return (
    <div style={styles.container}>
      <WindowCustomBar />
      <div style={{ display: isSettingsOpen ? "block" : "none" }}>
        <SettingsPage />
      </div>
      <div style={{ display: isSettingsOpen ? "none" : "block" }}>
        <RibbonMenu />
        <ResizablePanelGroup
          direction="horizontal"
          style={{
            height: "calc(100vh - 204px)",
            width: "100vw",
          }}
        >
          <ResizablePanel
            defaultSize={325}
            minSize={262}
            maxSize={325}
            style={{ minWidth: "262px", maxWidth: "325px" }}
          >
            <Toolbox />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75} minSize={30}>
            <div
              style={{
                height: "100%",
                width: "100%",
                position: "relative",
              }}
            >
              <Viewer viewMode={viewMode} onViewModeChange={setViewMode} />
              <HeightProfileViewer display="none" />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        <StatusBar />
      </div>
    </div>
  );
}

export default Main;
