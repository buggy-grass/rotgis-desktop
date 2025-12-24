import React from "react";
import { makeUseStyles } from "../../styles/makeUseStyles";
import {
  Boxes,
  Eye,
  Folders,
  FolderTree,
  Layers,
  LayersPlus,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Wrench,
  X,
} from "lucide-react";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Button } from "../ui/button";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarShortcut,
} from "../ui/menubar";
import FolderStructure from "./FolderStructure";
import LayerBox, { LayersRef } from "./LayerBox";

const useStyles = makeUseStyles({
  container: {
    width: "100%",
    height: "100%",
  },
  header: {
    height: "20px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: "10px",
    background: "#262626",
  },
  body: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    height: "calc(100% - 20px)",
    overflowY: "auto",
    background: "#1e1e1e",
  },
  toolboxMenu: {
    width: "50px",
    height: "100%",
    background: "#212121",
  },
  toolboxContent: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "calc(100% - 50px)",
  },
  toolboxShortcut: {
    height: "30px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    background: "#262626",
  },
});

function Toolbox() {
  const styles = useStyles();
  const [activeTab, setActiveTab] = React.useState<string>("layers");
  const tabRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  const layersRef = React.useRef<LayersRef>(null);

  const tablist = [
    { value: "layers", label: "Layers", icon: Layers },
    { value: "folder_structure", label: "Folder Structure", icon: Folders },
    { value: "point_cloud", label: "Point Cloud", icon: Wrench },
    { value: "mesh", label: "Mesh", icon: Wrench },
  ];

  // Aktif tab değiştiğinde indicator'ı hareket ettir
  React.useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    const indicator = indicatorRef.current;

    if (activeTabElement && indicator) {
      const tabTop = activeTabElement.offsetTop;
      const tabHeight = activeTabElement.offsetHeight;
      const indicatorHeight = 24;

      indicator.style.top = `${tabTop + (tabHeight - indicatorHeight) / 2}px`;
    }
  }, [activeTab]);

  return (
    <div style={styles.container} className="border-r border-border">
      <div style={styles.header}>
        <Label icon={Boxes} iconClassName="h-3 w-3">
          {"Toolbox/" +
            activeTab.charAt(0).toUpperCase() +
            activeTab.slice(1).replace("_", " ")}
        </Label>
        <div>
          <X
            className="h-3.5 w-3.5"
            style={{ position: "relative", cursor: "pointer", right: "3px" }}
          />
        </div>
      </div>
      <div style={styles.body} className="overflow-x-hidden">
        <div style={styles.toolboxMenu} className="border-r border-border">
          <TooltipProvider>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Kayan indicator bar */}
              <div
                ref={indicatorRef}
                style={{
                  position: "absolute",
                  left: 0,
                  width: "3px",
                  height: "24px",
                  backgroundColor: "#fdfdfdff",
                  borderRadius: "0 2px 2px 0",
                  transition: "top 0.2s ease-in-out",
                  pointerEvents: "none",
                }}
              />

              {tablist.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <Tooltip key={tab.value} delayDuration={50}>
                    <TooltipTrigger asChild>
                      <div
                        ref={(el) => (tabRefs.current[tab.value] = el)}
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "40px",
                          cursor: "pointer",
                          position: "relative",
                        }}
                        onClick={() => setActiveTab(tab.value)}
                      >
                        {tab.icon && (
                          <tab.icon
                            className={`h-4 w-4 m-3 transition-all duration-200 ${
                              isActive ? "text-white" : "text-muted-foreground"
                            }`}
                            strokeWidth={isActive ? 2.5 : 1.5}
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      showArrow={false}
                      style={{ marginLeft: "-15px" }}
                    >
                      <p>{tab.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
        <div style={styles.toolboxContent}>
          {activeTab === "layers" && (
            <>
              <div
                style={styles.toolboxShortcut}
                className="border-b border-t border-border px-1"
              >
                <TooltipProvider>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "40px",
                          cursor: "pointer",
                          position: "relative",
                        }}
                      >
                        <Button
                          className="flex items-center"
                          variant={"naked"}
                          style={{ width: "16px", height: "16px" }}
                          icon={LayersPlus}
                          iconClassName="w-1 h-1"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      showArrow={false}
                      style={{ marginBottom: "-10px" }}
                    >
                      <p>{"Add Layer"}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "40px",
                          cursor: "pointer",
                          position: "relative",
                        }}
                        onClick={() => {
                          if (layersRef.current) {
                            layersRef.current.expandAll();
                          }
                        }}
                      >
                        <Button
                          className="flex items-center"
                          variant={"naked"}
                          style={{ width: "16px", height: "16px" }}
                          icon={ListChevronsUpDown}
                          iconClassName="w-1 h-1"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      showArrow={false}
                      style={{ marginBottom: "-10px" }}
                    >
                      <p>{"Expand All"}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "40px",
                          cursor: "pointer",
                          position: "relative",
                        }}
                        onClick={() => {
                          if (layersRef.current) {
                            layersRef.current.collapseAll();
                          }
                        }}
                      >
                        <Button
                          className="flex items-center"
                          variant={"naked"}
                          style={{ width: "16px", height: "16px" }}
                          icon={ListChevronsDownUp}
                          iconClassName="w-1 h-1"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      showArrow={false}
                      style={{ marginBottom: "-10px" }}
                    >
                      <p>{"Collapse All"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Menubar
                  className="h-4 text-xs"
                  style={{ border: "none", zIndex: 10002, position: "relative", background: "transparent" }}
                >
                  <MenubarMenu>
                    <MenubarTrigger asChild className="h-6 px-2 text-xs">
                      <Button
                        className="flex items-center"
                        variant={"naked"}
                        style={{ width: "16px", height: "16px" }}
                        icon={Eye}
                        iconClassName="w-1 h-1"
                      />
                    </MenubarTrigger>
                    <MenubarContent className="text-xs" style={{ zIndex: 10002 }}>
                      <MenubarItem className="text-xs py-1" inset>
                        Show All Layers
                      </MenubarItem>
                      <MenubarItem className="text-xs py-1" inset>
                        Hide All Layers
                      </MenubarItem>
                      <MenubarItem className="text-xs py-1" inset>
                        Show Selected Layer
                      </MenubarItem>
                      <MenubarItem className="text-xs py-1" inset>
                        Hide Selected Layer
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
              </div>
              <div style={{ height: "calc(100% - 30px)", overflow: "auto" }}>
                <LayerBox ref={layersRef} />
              </div>
            </>
          )}
          {activeTab === "folder_structure" && (
            <FolderStructure />
          )}
        </div>
      </div>
    </div>
  );
}

export default Toolbox;
