import React, { useState, useEffect, useRef } from 'react';
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
  Spline,
  Tangent,
  VectorSquare,
  RulerDimensionLine,
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
  const [selectedMeasureTool, setSelectedMeasureTool] = useState<string | null>(null);
  const pendingMeasurementRef = useRef<any>(null);
  
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

  // Listen to measurement_removed event to detect when measurement is cancelled
  useEffect(() => {
    if (!window.viewer || !window.viewer.scene) {
      return;
    }

    const handleMeasurementRemoved = (event: any) => {
      const measurement = event.measurement;
      if (!measurement) return;

      // If this is the pending measurement that was just cancelled, close toggle button
      if (pendingMeasurementRef.current === measurement || 
          (pendingMeasurementRef.current && pendingMeasurementRef.current.uuid === measurement.uuid)) {
        setSelectedMeasureTool(null);
        StatusBarActions.setOperation("Ready");
        pendingMeasurementRef.current = null;
      }
    };
    
    // Also check if activeMeasure is cleared (for cases where measurement is removed but event doesn't fire)
    // This is especially important for Distance measurement where callback might not fire
    const checkActiveMeasure = () => {
      if (pendingMeasurementRef.current && selectedMeasureTool) {
        const isActiveMeasureNull = window.viewer?.measuringTool?.activeMeasure === null;
        const measurementStillInScene = window.viewer?.scene?.measurements?.find(
          (m: any) => m === pendingMeasurementRef.current || 
                      (pendingMeasurementRef.current?.uuid && m.uuid === pendingMeasurementRef.current.uuid)
        );
        
        // If activeMeasure is null and measurement is not in scene, it was cancelled
        if (isActiveMeasureNull && !measurementStillInScene) {
          // Measurement was removed but event didn't fire, close toggle button
          setSelectedMeasureTool(null);
          StatusBarActions.setOperation("Ready");
          pendingMeasurementRef.current = null;
        }
      }
    };
    
    // Poll for activeMeasure changes (fallback mechanism for Distance and other measurements)
    const pollInterval = setInterval(checkActiveMeasure, 200);

    window.viewer.scene.addEventListener("measurement_removed", handleMeasurementRemoved);

    return () => {
      if (window.viewer && window.viewer.scene) {
        window.viewer.scene.removeEventListener("measurement_removed", handleMeasurementRemoved);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  const drawMeasurement = (toolType: string | null) => {
    if (!toolType) {
      stopMeasureInsertion();
      return;
    }

    switch (toolType) {
      case "Height":
        if (window.viewer?.measuringTool) {
          const measureHeight = window.viewer.measuringTool.startInsertion(
            {
              showDistances: false,
              showHeight: true,
              showArea: false,
              closed: false,
              maxMarkers: 2,
              name: "Height",
            },
            async function () {
              // Get measurement reference
              let measurement = null;
              if (window.viewer?.measuringTool?.activeMeasure) {
                measurement = window.viewer.measuringTool.activeMeasure;
              } else if (window.viewer?.scene?.measurements && window.viewer.scene.measurements.length > 0) {
                measurement = window.viewer.scene.measurements[window.viewer.scene.measurements.length - 1];
              }
              
              if (!measurement) {
                await saveMeasurements();
                return;
              }
              
              // Determine minimum points required based on measurement type
              // Height needs at least 2 points
              const minPoints = 2;
              
              // Final check - only emit if measurement has minimum required points
              const finalPoints = measurement.points ? measurement.points.length : 0;
              if (finalPoints >= minPoints && window.eventBus) {
                window.eventBus.emit("measurement-finished", { measurement });
                pendingMeasurementRef.current = null; // Clear pending reference
              } else {
                // If not enough points, cancel/remove the measurement
                // Store reference to detect removal
                pendingMeasurementRef.current = measurement;
                if (window.viewer?.measuringTool?.activeMeasure === measurement) {
                  window.viewer.measuringTool.setNullActiveMeasure();
                }
                if (window.viewer?.scene) {
                  window.viewer.scene.removeMeasurement(measurement);
                }
                // Reset will be handled by measurement_removed event listener
              }
              
              await saveMeasurements();
            }
          );
          if (measureHeight) {
            pendingMeasurementRef.current = measureHeight;
          }
        }
        break;
      case "Distance":
        if (window.viewer?.measuringTool) {
          const measure = window.viewer.measuringTool.startInsertion(
            {
              showDistances: true,
              showArea: false,
              closed: false,
              name: "Distance",
            },
            async function () {
              // Get measurement reference
              let measurement = null;
              if (window.viewer?.measuringTool?.activeMeasure) {
                measurement = window.viewer.measuringTool.activeMeasure;
              } else if (window.viewer?.scene?.measurements && window.viewer.scene.measurements.length > 0) {
                measurement = window.viewer.scene.measurements[window.viewer.scene.measurements.length - 1];
              }

              console.error(measurement)
              
              if (!measurement) {
                await saveMeasurements();
                return;
              }
              
              // Determine minimum points required based on measurement type
              // Distance needs at least 2 points for a line
              const minPoints = 2;
              
              // Final check - only emit if measurement has minimum required points
              const finalPoints = measurement.points ? measurement.points.length : 0;
              if (finalPoints >= minPoints && window.eventBus) {
                window.eventBus.emit("measurement-finished", { measurement });
                pendingMeasurementRef.current = null; // Clear pending reference
              } else {
                // If not enough points, cancel/remove the measurement
                // Store reference to detect removal
                pendingMeasurementRef.current = measurement;
                if (window.viewer?.measuringTool?.activeMeasure === measurement) {
                  window.viewer.measuringTool.setNullActiveMeasure();
                }
                if (window.viewer?.scene) {
                  window.viewer.scene.removeMeasurement(measurement);
                }
                // Reset will be handled by measurement_removed event listener
              }
              
              await saveMeasurements();
            }
          );
          if (measure) {
            pendingMeasurementRef.current = measure;
          }
        }
        break;
      case "Area":
        if (window.viewer?.measuringTool) {
          const measureArea = window.viewer.measuringTool.startInsertion(
            {
              showDistances: true,
              showArea: true,
              closed: true,
              name: "Area",
            },
            async function () {
              // Get measurement reference
              let measurement = null;
              if (window.viewer?.measuringTool?.activeMeasure) {
                measurement = window.viewer.measuringTool.activeMeasure;
              } else if (window.viewer?.scene?.measurements && window.viewer.scene.measurements.length > 0) {
                measurement = window.viewer.scene.measurements[window.viewer.scene.measurements.length - 1];
              }
              
              if (!measurement) {
                await saveMeasurements();
                return;
              }
              
              // Determine minimum points required based on measurement type
              // Area needs at least 3 points to form a polygon
              const minPoints = 3;
              
              // For area measurements, wait and poll until measurement has enough points
              // Potree.js callback fires before the last click is fully processed
              let attempts = 0;
              const maxAttempts = 20; // 20 attempts * 50ms = 1 second max wait
              
              while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Re-check measurement points count
                const currentPoints = measurement.points ? measurement.points.length : 0;
                
                // If we have enough points, measurement is complete
                if (currentPoints >= minPoints) {
                  break;
                }
                
                attempts++;
              }
              
              // Final check - only emit if measurement has minimum required points
              const finalPoints = measurement.points ? measurement.points.length : 0;
              if (finalPoints >= minPoints && window.eventBus) {
                window.eventBus.emit("measurement-finished", { measurement });
                pendingMeasurementRef.current = null; // Clear pending reference
              } else {
                // If not enough points, cancel/remove the measurement
                // Store reference to detect removal
                pendingMeasurementRef.current = measurement;
                if (window.viewer?.measuringTool?.activeMeasure === measurement) {
                  window.viewer.measuringTool.setNullActiveMeasure();
                }
                if (window.viewer?.scene) {
                  window.viewer.scene.removeMeasurement(measurement);
                }
                // Reset will be handled by measurement_removed event listener
              }
              
              await saveMeasurements();
            }
          );
          if (measureArea) {
            pendingMeasurementRef.current = measureArea;
          }
        }
        break;
      case "Angle":
        if (window.viewer?.measuringTool) {
          const measureAngle = window.viewer.measuringTool.startInsertion(
            {
              showDistances: false,
              showAngles: true,
              showArea: false,
              closed: true,
              maxMarkers: 3,
              name: "Angle",
            },
            async function () {
              // Get measurement reference
              let measurement = null;
              if (window.viewer?.measuringTool?.activeMeasure) {
                measurement = window.viewer.measuringTool.activeMeasure;
              } else if (window.viewer?.scene?.measurements && window.viewer.scene.measurements.length > 0) {
                measurement = window.viewer.scene.measurements[window.viewer.scene.measurements.length - 1];
              }
              
              if (!measurement) {
                await saveMeasurements();
                return;
              }
              
              // Determine minimum points required based on measurement type
              // Angle needs at least 3 points
              const minPoints = 3;
              
              // Final check - only emit if measurement has minimum required points
              const finalPoints = measurement.points ? measurement.points.length : 0;
              if (finalPoints >= minPoints && window.eventBus) {
                window.eventBus.emit("measurement-finished", { measurement });
                pendingMeasurementRef.current = null; // Clear pending reference
              } else {
                // If not enough points, cancel/remove the measurement
                // Store reference to detect removal
                pendingMeasurementRef.current = measurement;
                if (window.viewer?.measuringTool?.activeMeasure === measurement) {
                  window.viewer.measuringTool.setNullActiveMeasure();
                }
                if (window.viewer?.scene) {
                  window.viewer.scene.removeMeasurement(measurement);
                }
                // Reset will be handled by measurement_removed event listener
              }
              
              await saveMeasurements();
            }
          );
          if (measureAngle) {
            pendingMeasurementRef.current = measureAngle;
          }
        }
        break;
      default:
        break;
    }
  };

  const saveMeasurements = () => {
    if (window.viewer && window.viewer.measuringTool) {
      window.viewer.measuringTool.setNullActiveMeasure();
    }
    // Reset measurement tool selection and status bar after measurement is completed
    setSelectedMeasureTool(null);
    StatusBarActions.setOperation("Ready");
  };

  const stopMeasureInsertion = () => {
    if (
      window.viewer &&
      window.viewer.measuringTool &&
      window.viewer.measuringTool.activeMeasure != null
    ) {
      window.viewer.measuringTool.endInsertion();
      window.viewer.measuringTool.setNullActiveMeasure();
    }
  };

  const handleMeasurementToolClick = (toolType: string) => {
    // If the same tool is already selected, deselect it
    if (selectedMeasureTool === toolType) {
      setSelectedMeasureTool(null);
      stopMeasureInsertion();
      StatusBarActions.setOperation("Ready");
    } else {
      // If a different tool is selected, stop it first
      if (selectedMeasureTool) {
        stopMeasureInsertion();
      }
      // Select the new tool
      setSelectedMeasureTool(toolType);
      drawMeasurement(toolType);
      
      // Get icon name for StatusBar based on tool type
      let iconName: string | undefined;
      switch (toolType) {
        case "Distance":
          iconName = "Spline";
          break;
        case "Area":
          iconName = "VectorSquare";
          break;
        case "Angle":
          iconName = "Tangent";
          break;
        case "Height":
          iconName = "RulerDimensionLine";
          break;
        default:
          iconName = undefined;
      }
      
      // Update StatusBar with tool label and icon
      StatusBarActions.setOperation(toolType, iconName);
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
            { 
              label: "Distance", 
              icon: Spline, 
              variant: "ghost", 
              toggle: true,
              onClick: () => handleMeasurementToolClick("Distance")
            },
            { 
              label: "Area", 
              icon: VectorSquare, 
              variant: "ghost", 
              toggle: true,
              onClick: () => handleMeasurementToolClick("Area")
            },
            { 
              label: "Angle", 
              icon: Tangent, 
              variant: "ghost", 
              toggle: true,
              onClick: () => handleMeasurementToolClick("Angle")
            },
            { 
              label: "Height", 
              icon: RulerDimensionLine, 
              variant: "ghost", 
              toggle: true,
              onClick: () => handleMeasurementToolClick("Height")
            },
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
                  // For measurement tools, check selectedMeasureTool state
                  const isMeasurementTool = tab.value === "measurement" && group.title === "Tools";
                  const isActive = isMeasurementTool 
                    ? selectedMeasureTool === button.label
                    : (activeButtons[buttonKey] || false);
                  const isToggle = button.toggle && (tab.value === "measurement" || tab.value === "drawing");
                  
                  const handleClick = () => {
                    if (isToggle) {
                      // For measurement tools, use special handling
                      if (tab.value === "measurement" && group.title === "Tools") {
                        // Call the onClick handler which handles measurement tool logic
                        if (button.onClick) {
                          button.onClick();
                        }
                        return;
                      }
                      
                      // For other toggle buttons, use standard toggle logic
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
                    
                    // Call original onClick if provided (for non-measurement tools)
                    if (button.onClick && !(tab.value === "measurement" && group.title === "Tools")) {
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
