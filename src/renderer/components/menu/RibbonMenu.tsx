import React, { useState, useEffect } from 'react';
import { makeUseStyles } from '../../styles/makeUseStyles';
import { Button } from "../ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Ruler,
  Pencil,
  Cloud,
  Box,
  RulerIcon,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Layers,
  Settings,
  Download,
  Upload,
  Save,
  FileText,
  Image,
  Grid3x3,
  Navigation,
  Eye,
  EyeOff,
  LucideIcon,
} from "lucide-react";
import { SaveProjectDialog } from '../dialogs/SaveProjectDialog';
import ProjectService from '../../services/ProjectService';
import ProjectActions from '../../store/actions/ProjectActions';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { manualSaveProject } from '../../services/ProjectAutoSave';
import StatusBarActions from '../../store/actions/StatusBarActions';

// Helper function to get icon name from LucideIcon component
const getIconName = (icon: LucideIcon): string => {
  // Try to get name from component
  const name = (icon as any).name || (icon as any).displayName;
  if (name) return name;
  
  // Fallback: try to extract from toString or function name
  const funcName = icon.toString().match(/function\s+(\w+)/)?.[1];
  if (funcName) return funcName;
  
  return "Ruler"; // Default fallback
};

const useStyles = makeUseStyles({
  container: {
    width: "100%",
    minHeight: "100px",
    backgroundColor: "#1e1e1e",
    transition: "all 0.3s ease-in-out",
  },
  ribbonContent: {
    padding: "8px 12px",
    borderTop: "1px solid var(--border)",
    backgroundColor: "#1e1e1e",
    display: "flex",
    alignItems: "flex-start",
    gap: "0px",
    minHeight: "80px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2px",
    padding: "4px 6px",
    minHeight: "60px",
  },
});

interface RibbonGroup {
  title: string;
  buttons: {
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    variant?: "default" | "ghost" | "outline";
    size?: "sm" | "default" | "lg";
    toggle?: boolean;
  }[];
}

interface RibbonTab {
  value: string;
  label: string;
  icon?: LucideIcon;
  groups: RibbonGroup[];
}

function RibbonMenu() {
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState("measurement");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activeButtons, setActiveButtons] = useState<Record<string, boolean>>({});
  
  // Get project from store
  const projectState = useSelector((state: RootState) => state.projectReducer);
  const currentProject = projectState.project;

  // CTRL+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        
        // If project is already saved, just save it
        if (projectState.projectFilePath && projectState.project) {
          try {
            await manualSaveProject();
          } catch (error) {
            console.error('Error saving project:', error);
            // If save fails, open dialog
            setShowSaveDialog(true);
          }
        } else {
          // Project not saved yet, open dialog
          setShowSaveDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [projectState.projectFilePath, projectState.project]);

  const handleSaveProject = async (projectName: string, savePath: string, epsg: number) => {
    if (!currentProject) {
      throw new Error('No project to save');
    }

    try {
      // Update project name
      currentProject.project.name = projectName;
      
      // Update project EPSG
      currentProject.project.outcoordsys.epsg.code = epsg;
      
      // Save project
      const result = await ProjectService.save(currentProject, savePath);
      console.log('Project saved:', result);
      
      // Update project in store
      ProjectActions.updateProject(currentProject);
      ProjectActions.setProjectPaths(result.projectFile, result.projectFolder);
      ProjectActions.setDirty(false);
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  };

  const ribbonTabs: RibbonTab[] = [
    {
      value: "measurement",
      label: "Measurement",
      icon: Ruler,
      groups: [
        {
          title: "Tools",
          buttons: [
            { label: "Distance", icon: RulerIcon, variant: "ghost", toggle: true },
            { label: "Area", icon: Grid3x3, variant: "ghost", toggle: true },
            { label: "Volume", icon: Box, variant: "ghost", toggle: true },
          ],
        },
        {
          title: "Actions",
          buttons: [
            { label: "Clear", icon: RotateCw, variant: "ghost" },
            { label: "Export", icon: Download, variant: "ghost" },
          ],
        },
      ],
    },
    {
      value: "drawing",
      label: "Drawing",
      icon: Pencil,
      groups: [
        {
          title: "Draw",
          buttons: [
            { label: "Line", icon: Pencil, variant: "ghost", toggle: true },
            { label: "Polygon", icon: Grid3x3, variant: "ghost", toggle: true },
            { label: "Circle", icon: RotateCw, variant: "ghost", toggle: true },
          ],
        },
        {
          title: "Edit",
          buttons: [
            { label: "Move", icon: Move, variant: "ghost", toggle: true },
            { label: "Rotate", icon: RotateCw, variant: "ghost", toggle: true },
            { label: "Delete", icon: RotateCw, variant: "ghost" },
          ],
        },
        {
          title: "View",
          buttons: [
            { label: "Zoom In", icon: ZoomIn, variant: "ghost" },
            { label: "Zoom Out", icon: ZoomOut, variant: "ghost" },
            { label: "Fit", icon: Navigation, variant: "ghost" },
          ],
        },
      ],
    },
    {
      value: "point_cloud",
      label: "Point Cloud",
      icon: Cloud,
      groups: [
        {
          title: "Load",
          buttons: [
            { label: "Open", icon: Upload, variant: "default" },
            { label: "Import", icon: FileText, variant: "ghost" },
          ],
        },
        {
          title: "Display",
          buttons: [
            { label: "Show", icon: Eye, variant: "ghost" },
            { label: "Hide", icon: EyeOff, variant: "ghost" },
            { label: "Settings", icon: Settings, variant: "ghost" },
          ],
        },
        {
          title: "Export",
          buttons: [
            { label: "Save", icon: Save, variant: "ghost" },
            { label: "Export", icon: Download, variant: "ghost" },
          ],
        },
      ],
    },
    {
      value: "mesh",
      label: "Mesh",
      icon: Box,
      groups: [
        {
          title: "Load",
          buttons: [
            { label: "Open", icon: Upload, variant: "default" },
            { label: "Import", icon: FileText, variant: "ghost" },
          ],
        },
        {
          title: "Edit",
          buttons: [
            { label: "Transform", icon: Move, variant: "ghost" },
            { label: "Rotate", icon: RotateCw, variant: "ghost" },
            { label: "Scale", icon: ZoomIn, variant: "ghost" },
          ],
        },
        {
          title: "Export",
          buttons: [
            { label: "Save", icon: Save, variant: "ghost" },
            { label: "Export", icon: Download, variant: "ghost" },
            { label: "Image", icon: Image, variant: "ghost" },
          ],
        },
      ],
    },
  ];

  const renderRibbonContent = (tab: RibbonTab) => {
    return (
      <div 
        style={styles.ribbonContent} 
        className="overflow-x-auto"
        key={tab.value}
      >
        {tab.groups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && (
              <div 
                style={{ 
                  width: "1px", 
                  backgroundColor: "hsl(var(--border))",
                  minHeight: "70px",
                  margin: "0 4px",
                  alignSelf: "stretch",
                  flexShrink: 0,
                  transition: "opacity 0.2s ease-in-out",
                }} 
              />
            )}
            <div 
              style={styles.buttonGroup}
              className="ribbon-button-group"
            >
              <div className="grid grid-cols-2 gap-1">
                {group.buttons.map((button, buttonIndex) => {
                  const IconComponent = button.icon;
                  const buttonKey = `${tab.value}-${groupIndex}-${buttonIndex}`;
                  const isActive = activeButtons[buttonKey] || false;
                  const isToggle = button.toggle && (tab.value === "measurement" || tab.value === "drawing");
                  
                  const handleClick = () => {
                    if (isToggle) {
                      // Toggle button state
                      const newState = !isActive;
                      
                      // If activating this button, deactivate all other buttons in the same group
                      if (newState) {
                        setActiveButtons(prev => {
                          const newState = { ...prev };
                          // Deactivate all buttons in the same group
                          group.buttons.forEach((_, idx) => {
                            const otherButtonKey = `${tab.value}-${groupIndex}-${idx}`;
                            if (otherButtonKey !== buttonKey) {
                              newState[otherButtonKey] = false;
                            }
                          });
                          // Activate current button
                          newState[buttonKey] = true;
                          return newState;
                        });
                        
                        // Update StatusBar
                        const iconName = getIconName(button.icon);
                        StatusBarActions.setOperation(button.label, iconName);
                      } else {
                        // Deactivate current button
                        setActiveButtons(prev => ({
                          ...prev,
                          [buttonKey]: false,
                        }));
                        
                        // Update StatusBar to Ready
                        StatusBarActions.setOperation("Ready");
                      }
                    }
                    
                    // Call original onClick if provided
                    if (button.onClick) {
                      button.onClick();
                    }
                  };
                  
                  return (
                    <Button
                      key={buttonIndex}
                      variant={isActive && isToggle ? "default" : (button.variant || "ghost")}
                      size={button.size || "sm"}
                      className="h-auto w-auto min-h-[48px] min-w-[48px] max-w-[48px] px-1 py-1 text-xs flex flex-col items-center justify-center gap-0.5 hover:bg-accent transition-colors duration-150 aspect-square"
                      onClick={handleClick}
                    >
                      <IconComponent className="h-3 w-3 flex-shrink-0" />
                      <span className="text-[9px] leading-tight text-center whitespace-normal break-words line-clamp-2">{button.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <>
      <SaveProjectDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        projectName={currentProject?.project.name || "Untitled Project"}
        onSave={handleSaveProject}
      />
      <div className="border-b border-border" style={styles.container}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .ribbon-tab-content {
          animation: fadeIn 0.8s ease-out;
        }
        
        .ribbon-button-group {
          opacity: 0;
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-7 rounded-none border-b border-border bg-[#262626] p-0 transition-all duration-200">
          {ribbonTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-7 px-3 text-xs data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all duration-200 hover:bg-[#2a2a2a] relative overflow-hidden group"
                icon={IconComponent}
              >
                <span className="relative z-10 transition-all duration-200">{tab.label}</span>
                <span className="absolute inset-0 bg-primary/10 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {ribbonTabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="m-0 p-0 ribbon-tab-content"
          >
            {renderRibbonContent(tab)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
    </>
  );
}

export default RibbonMenu;
