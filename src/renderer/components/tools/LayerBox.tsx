import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  Layers as LayersIcon,
  Eye,
  EyeOff,
  Settings,
  X,
  Info,
  Trash2,
  Scan,
  Spline,
  VectorSquare,
  RulerDimensionLine,
  Tangent,
  Circle,
} from "lucide-react";
import { RootState } from "../../store/store";
import {
  PointCloud,
  Mesh,
  Orthophoto,
  Raster,
  MeasurementLayer,
  AnnotationLayer,
} from "../../types/ProjectTypes";
import PotreeService from "../../services/PotreeService";
import ProjectActions from "../../store/actions/ProjectActions";
import PointCloudService from "../../services/PointCloudService";

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  type: "point-cloud" | "mesh" | "orthophoto" | "dsm" | "dtm" | "raster" | "measurement" | "annotation";
  data?: PointCloud | Mesh | Orthophoto | Raster | MeasurementLayer | AnnotationLayer;
  children?: Layer[];
}

export interface LayersRef {
  expandAll: () => void;
  collapseAll: () => void;
}

interface LayersProps {}

const Layers = forwardRef<LayersRef, LayersProps>((props, ref) => {
  const project = useSelector(
    (state: RootState) => state.projectReducer.project
  );
  // Note: layerVisibility is now managed through pointCloud.visible in Redux
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedPointCloud, setSelectedPointCloud] =
    useState<PointCloud | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [rasterVisibility, setRasterVisibility] = useState<Record<string, boolean>>({});

  // Filter valid point clouds (with existing assets)
  const [validPointClouds, setValidPointClouds] = useState<PointCloud[]>([]);

  useEffect(() => {
    if (!project?.metadata?.pointCloud || !project?.project?.path) {
      setValidPointClouds([]);
      return;
    }

    const validatePointClouds = async () => {
      const valid: PointCloud[] = [];

      for (const pc of project.metadata.pointCloud) {
        if (!pc.asset) {
          console.warn(`Point cloud ${pc.id} has no asset, skipping`);
          continue;
        }

        const assetPath = window.electronAPI.pathJoin(
          project.project.path,
          pc.asset
        );

        try {
          // Check if asset file exists
          await window.electronAPI.readProjectXML(assetPath);
          valid.push(pc);
        } catch (error) {
          console.warn(
            `Point cloud asset not found, removing from LayerBox: ${assetPath}`
          );
          // Asset doesn't exist, skip
        }
      }

      setValidPointClouds(valid);
    };

    validatePointClouds();
  }, [project?.metadata?.pointCloud, project?.project?.path]);

  // Convert project metadata to Layer structure
  const layers = useMemo<Layer[]>(() => {
    const { mesh, orthophoto, raster, dsm, dtm } = project?.metadata || {};

    const layersArray: Layer[] = [];

    // Point Cloud Layer - always show, even if empty
    layersArray.push({
      id: "point-cloud-parent",
      name: "Point Cloud Layer",
      visible: true, // Parent layers are always visible
      type: "point-cloud",
      children:
        validPointClouds && validPointClouds.length > 0
          ? validPointClouds.map((pc) => {
              const measurementLayers: Layer[] = (pc.layers || [])
                .filter((layer) => layer.type === "measurement")
                .map((layer) => ({
                  id: layer.id,
                  name: layer.name,
                  visible: layer.visible,
                  type: "measurement" as const,
                  data: layer,
                }));
              const annotationLayers: Layer[] = (pc.layers || [])
                .filter((layer) => layer.type === "annotation")
                .map((layer) => ({
                  id: layer.id,
                  name: (layer as AnnotationLayer).title,
                  visible: layer.visible,
                  type: "annotation" as const,
                  data: layer as AnnotationLayer,
                }));

              return {
                id: pc.id,
                name: `${pc.name}${pc.extension}`,
                visible: pc.visible !== false,
                type: "point-cloud",
                data: pc,
                children: [...measurementLayers, ...annotationLayers],
              };
            })
          : [],
    });

    // Mesh Layer - always show, even if empty
    // layersArray.push({
    //   id: "mesh-parent",
    //   name: "Mesh Layer",
    //   visible: true, // Parent layers are always visible
    //   type: "mesh",
    //   children:
    //     mesh && mesh.length > 0
    //       ? mesh.map((m) => ({
    //           id: m.id,
    //           name: m.name,
    //           visible: true, // Default to true for other layer types
    //           type: "mesh",
    //           data: m,
    //         }))
    //       : [],
    // });

    // Vector Layer (Orthophoto, DSM, DTM) - always show, even if empty
    const vectorChildren: Layer[] = [];
    if (orthophoto && orthophoto.length > 0) {
      vectorChildren.push(
        ...orthophoto.map((ortho) => ({
          id: ortho.id,
          name: ortho.name,
          visible: true, // Default to true for other layer types
          type: "orthophoto" as const,
          data: ortho,
        }))
      );
    }

    if (dsm && dsm.length > 0) {
      vectorChildren.push(
        ...dsm.map((d) => ({
          id: d.id,
          name: d.name,
          visible: true, // Default to true for other layer types
          type: "dsm" as const,
          data: d,
        }))
      );
    }

    if (dtm && dtm.length > 0) {
      vectorChildren.push(
        ...dtm.map((d) => ({
          id: d.id,
          name: d.name,
          visible: true,
          type: "dtm" as const,
          data: d,
        }))
      );
    }

    layersArray.push({
      id: "vector-parent",
      name: "Vector Layer",
      visible: true,
      type: "orthophoto",
      children: vectorChildren,
    });

    // Raster Layer (görünürlük rasterVisibility state ile)
    const rasterChildren: Layer[] = (raster || []).map((r) => ({
      id: r.id,
      name: `${r.name}${r.extension}`,
      visible: rasterVisibility[r.id] ?? true,
      type: "raster" as const,
      data: r,
    }));
    layersArray.push({
      id: "raster-parent",
      name: "Raster Layer",
      visible: true,
      type: "raster",
      children: rasterChildren,
    });

    return layersArray;
  }, [project?.metadata, validPointClouds, rasterVisibility]);

  // Get all layer IDs that have children or are point clouds (Measurements/Annotation accordion için)
  const getAllLayerIdsWithChildren = (items: Layer[]): string[] => {
    const ids: string[] = [];
    items.forEach((item) => {
      const isPointCloudRow =
        item.type === "point-cloud" &&
        item.id !== "point-cloud-parent" &&
        item.id !== "vector-parent" &&
        item.id !== "raster-parent";
      if (isPointCloudRow || (item.children && item.children.length > 0)) {
        ids.push(item.id);
        // Nokta bulutu altındaki Measurements ve Annotation accordion'ları da açılsın
        if (isPointCloudRow) {
          ids.push(`${item.id}-measurements`, `${item.id}-annotation`);
        }
        if (item.children && item.children.length > 0) {
          ids.push(...getAllLayerIdsWithChildren(item.children));
        }
      }
    });
    return ids;
  };

  // Expose expand/collapse functions via ref
  useImperativeHandle(
    ref,
    () => ({
      expandAll: () => {
        const allIds = getAllLayerIdsWithChildren(layers);
        setExpandedItems(allIds);
      },
      collapseAll: () => {
        setExpandedItems([]);
      },
    }),
    [layers]
  );

  // Auto-expand all layers when project is first loaded or point clouds are loaded
  const hasExpandedOnceRef = useRef(false);
  useEffect(() => {
    if (
      project &&
      layers.length > 0 &&
      validPointClouds.length > 0 &&
      !hasExpandedOnceRef.current
    ) {
      const allIds = getAllLayerIdsWithChildren(layers);
      setExpandedItems(allIds);
      hasExpandedOnceRef.current = true;
    }

    // Reset when project changes
    if (!project) {
      hasExpandedOnceRef.current = false;
    }
  }, [project?.project?.id, layers, validPointClouds.length]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerOpen && colorPickerRef.current) {
        const target = event.target as Node;
        if (!colorPickerRef.current.contains(target)) {
          setColorPickerOpen(null);
          setColorPickerPosition(null);
        }
      }
    };

    if (colorPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [colorPickerOpen]);

  const toggleVisibility = (
    layerId: string,
    layerType: string,
    pointCloudId?: string
  ) => {
    if (layerType === "point-cloud") {
      // Get current visibility from Redux
      const currentState = ProjectActions.getProjectState();
      const pointCloud = currentState.project?.metadata.pointCloud?.find(
        (pc) => pc.id === layerId
      );
      const currentVisible = pointCloud?.visible !== false; // Default to true

      // Toggle visibility using PointCloudService
      PointCloudService.pointCloudVisibility(layerId, !currentVisible);
    } else if (layerType === "measurement" && pointCloudId) {
      // Toggle measurement layer visibility
      const currentState = ProjectActions.getProjectState();
      const pointCloud = currentState.project?.metadata.pointCloud?.find(
        (pc) => pc.id === pointCloudId
      );
      const measurementLayer = pointCloud?.layers?.find(
        (l) => l.id === layerId
      );
        if (measurementLayer) {
        const currentVisible = measurementLayer.visible;
        ProjectActions.updateMeasurementLayerVisibility(
          pointCloudId,
          layerId,
          !currentVisible
        );

        // Also update visibility in Potree viewer
        if (window.viewer && window.viewer.scene) {
          const measurement = window.viewer.scene.measurements.find(
            (m: any) => m.uuid === layerId
          );
          if (measurement) {
            measurement.visible = !currentVisible;
          }
        }
      }
    } else if (layerType === "annotation" && pointCloudId) {
      const currentState = ProjectActions.getProjectState();
      const pointCloud = currentState.project?.metadata?.pointCloud?.find(
        (pc) => pc.id === pointCloudId
      );
      const annotationLayer = pointCloud?.layers?.find(
        (l) => l.id === layerId && l.type === "annotation"
      );
      if (annotationLayer) {
        const currentVisible = annotationLayer.visible;
        ProjectActions.updateAnnotationLayerVisibility(
          pointCloudId,
          layerId,
          !currentVisible
        );

        if (window.viewer && window.viewer.scene) {
          const annotation = window.viewer.scene.annotations.children.find(
            (m: any) => m.uuid === layerId
          );
          if (annotation) {
            annotation.visible = !currentVisible;
          }
        }
      }
    } else if (layerType === "raster") {
      const currentVisible = rasterVisibility[layerId] ?? true;
      setRasterVisibility((prev) => ({ ...prev, [layerId]: !currentVisible }));
      if (window.eventBus) {
        window.eventBus.emit("openlayers:rasterVisibility", {
          rasterId: layerId,
          visible: !currentVisible,
        });
      }
    } else {
      console.log(`Toggle visibility for ${layerType} layer ${layerId}`);
    }
  };

  const handleAccordionChange = (layerId: string, value: string) => {
    setExpandedItems((prev) => {
      if (value === layerId) {
        // Opening
        return prev.includes(layerId) ? prev : [...prev, layerId];
      } else {
        // Closing
        return prev.filter((id) => id !== layerId);
      }
    });
  };

  // Get icon for measurement layer based on icon type (using RibbonMenu icons)
  const getMeasurementIcon = (iconType?: string) => {
    switch (iconType) {
      case "Spline": // Distance
      case "distance":
        return Spline;
      case "VectorSquare": // Area
      case "area":
        return VectorSquare;
      case "RulerDimensionLine": // Height
      case "height":
        return RulerDimensionLine;
      case "Tangent": // Angle
      case "angle":
        return Tangent;
      case "Circle": // Point
      case "point":
        return Circle;
      default:
        return LayersIcon;
    }
  };

  const renderLayer = (
    layer: Layer,
    level: number = 0,
    parentPointCloudId?: string
  ): React.ReactNode => {
    const hasChildren = layer.children && layer.children.length > 0;
    const isPointCloudRow =
      layer.type === "point-cloud" &&
      layer.id !== "point-cloud-parent" &&
      layer.id !== "vector-parent" &&
      layer.id !== "raster-parent";
    // Nokta bulutu satırları her zaman açılabilir (Measurements/Annotation sekmeleri)
    const hasExpandableContent = isPointCloudRow || hasChildren;
    // For point clouds, get visibility from Redux; for measurements/annotations, get from data
    const isVisible =
      layer.type === "point-cloud" && layer.data
        ? (layer.data as PointCloud).visible !== false
        : layer.type === "measurement" && layer.data
        ? (layer.data as MeasurementLayer).visible
        : layer.type === "annotation" && layer.data
        ? (layer.data as AnnotationLayer).visible
        : layer.type === "raster"
        ? layer.visible
        : true;

    // Get point cloud ID for measurement/annotation layers
    const pointCloudId =
      layer.type === "measurement" && layer.data
        ? (layer.data as MeasurementLayer).pointCloudId
        : layer.type === "annotation" && layer.data
        ? (layer.data as AnnotationLayer).pointCloudId
        : layer.type === "point-cloud"
        ? layer.id
        : parentPointCloudId;

    // Get icon for measurement layers
    const MeasurementIcon =
      layer.type === "measurement" && layer.data
        ? getMeasurementIcon((layer.data as MeasurementLayer).icon)
        : LayersIcon;

    if (hasExpandableContent) {
      const isExpanded = expandedItems.includes(layer.id);
      
      const handleLayerClick = () => {
        // If it's a point cloud, focus to it
        if (layer.type === "point-cloud" && layer.data) {
          PotreeService.focusToPointCloud(layer.id);
        } else if (layer.type === "mesh" && layer.data) {
          PotreeService.focusToMesh(layer.id);
        }
      };

      const handleShowProperties = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuOpen(null);

        if (layer.type === "point-cloud" && layer.data) {
          const pc = layer.data as PointCloud;
          setSelectedPointCloud(pc);

          try {
            const projectState = ProjectActions.getProjectState();
            if (projectState.project?.project.path && pc.asset) {
              const metadataPath = window.electronAPI.pathJoin(
                projectState.project.project.path,
                pc.path
              );
              const size = await window.electronAPI.getFileSize(metadataPath);
              setFileSize(size);
            }
          } catch (error) {
            console.error("Error getting file size:", error);
            setFileSize(null);
          }
        }
      };

      const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuOpen(null);

        if (layer.type === "point-cloud" && layer.data) {
          const pc = layer.data as PointCloud;
          PotreeService.deletePointCloud(pc.id);
        }
      };

      return (
        <ContextMenu
          key={layer.id}
          open={contextMenuOpen === layer.id}
          onOpenChange={(open) => {
            if (!open) {
              setContextMenuOpen(null);
            } else {
              setContextMenuOpen(layer.id);
            }
          }}
        >
          <Accordion
            key={layer.id}
            type="single"
            collapsible
            className="w-full"
            value={isExpanded ? layer.id : ""}
            onValueChange={(value) => {
              handleAccordionChange(layer.id, value);
            }}
          >
            <AccordionItem value={layer.id} className="border-none">
              <ContextMenuTrigger asChild>
                <AccordionTrigger className="py-1 px-2 hover:bg-accent rounded-sm text-xs">
                  <div className="flex items-center gap-2 flex-1 text-left min-w-0">
                    <LayersIcon className="h-3 w-3 text-blue-400 flex-shrink-0" />
                    <span
                      className="truncate flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ maxWidth: "126px" }}
                    >
                      {layer.name}
                    </span>
                    <div
                      className={`flex items-center ${layer.type == "measurement" ? "gap-1" : ""}`}
                      onClick={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.stopPropagation()}
                    >
                      {layer.id != "mesh-parent" &&
                        layer.id != "point-cloud-parent" &&
                        layer.id != "vector-parent" &&
                        layer.id != "raster-parent" && (
                          <>
                            <div
                              className="h-7 w-7 p-1.5 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleVisibility(layer.id, layer.type, pointCloudId);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onContextMenu={(e) => e.stopPropagation()}
                            >
                              {isVisible ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            {/* Show focus button for point clouds, meshes, and rasters */}
                            {(layer.type === "point-cloud" || layer.type === "mesh" || layer.type === "raster") && (
                              <div
                                className="h-7 w-7 p-1.5 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleLayerClick();
                                }}
                                onContextMenu={(e) => e.stopPropagation()}
                              >
                                <Scan className="h-3 w-3" />
                              </div>
                            )}
                          </>
                        )}
                    </div>
                  </div>
                </AccordionTrigger>
              </ContextMenuTrigger>
              {/* Context menu only for point-cloud layers, not for parent layers */}
              {layer.type === "point-cloud" && layer.id !== "point-cloud-parent" && layer.id !== "mesh-parent" && layer.id !== "vector-parent" && layer.id !== "raster-parent" && (
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={handleShowProperties}
                    className="text-xs"
                  >
                    <Info className="mr-2 h-3 w-3" />
                    Properties
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={handleDelete}
                    className="text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              )}
              <AccordionContent className="pb-0 pt-0">
                {isPointCloudRow ? (
                  <div className="pl-3">
                    <Accordion
                      type="multiple"
                      className="w-full"
                      value={[
                        ...(expandedItems.includes(`${layer.id}-measurements`)
                          ? [`${layer.id}-measurements`]
                          : []),
                        ...(expandedItems.includes(`${layer.id}-annotation`)
                          ? [`${layer.id}-annotation`]
                          : []),
                      ]}
                      onValueChange={(value) => {
                        setExpandedItems((prev) => {
                          const without = prev.filter(
                            (id) =>
                              id !== `${layer.id}-measurements` &&
                              id !== `${layer.id}-annotation`
                          );
                          return [...without, ...(Array.isArray(value) ? value : [value])];
                        });
                      }}
                    >
                      <AccordionItem
                        value={`${layer.id}-measurements`}
                        className="border-none"
                      >
                        <AccordionTrigger className="py-0.5 px-1.5 hover:bg-accent rounded-sm text-[10px] min-h-0">
                          Measurements
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pt-0 pl-2">
                          {(layer.children || []).filter((c) => c.type === "measurement").length > 0 ? (
                            (layer.children || [])
                              .filter((c) => c.type === "measurement")
                              .map((child) =>
                                renderLayer(child, level + 1, pointCloudId)
                              )
                          ) : (
                            <div className="text-[10px] text-muted-foreground py-1.5">
                              Ölçüm yok
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem
                        value={`${layer.id}-annotation`}
                        className="border-none"
                      >
                        <AccordionTrigger className="py-0.5 px-1.5 hover:bg-accent rounded-sm text-[10px] min-h-0">
                          Annotation
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pt-0 pl-2">
                          {(layer.children || []).filter((c) => c.type === "annotation").length > 0 ? (
                            (layer.children || [])
                              .filter((c) => c.type === "annotation")
                              .map((child) =>
                                renderLayer(child, level + 1, pointCloudId)
                              )
                          ) : (
                            <div className="text-[10px] text-muted-foreground py-1.5">
                              Henüz annotation yok
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : (
                  <div className="pl-4">
                    {layer.children!.map((child) =>
                      renderLayer(child, level + 1, pointCloudId)
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ContextMenu>
      );
    } else {
      const handleLayerClick = () => {
        // If it's a point cloud, focus to it
        if (layer.type === "point-cloud" && layer.data) {
          PotreeService.focusToPointCloud(layer.id);
        } else if (layer.type === "mesh" && layer.data) {
          PotreeService.focusToMesh(layer.id);
        } else if (layer.type === "measurement" && layer.data) {
          const measurementLayer = layer.data as MeasurementLayer;
          PotreeService.focusToMeasure(measurementLayer.extent);
        } else if (layer.type === "annotation" && layer.data) {
          const annotationLayer = layer.data as AnnotationLayer;
          PotreeService.focusToMeasure(annotationLayer.extent);
        } else if (layer.type === "raster" && layer.data && window.eventBus) {
          const r = layer.data as Raster;
          const ring = r.wgs84Extent?.coordinates?.[0];
          if (ring?.length) {
            let minLon = ring[0][0], minLat = ring[0][1], maxLon = ring[0][0], maxLat = ring[0][1];
            for (let i = 1; i < ring.length; i++) {
              const [lon, lat] = ring[i];
              if (lon < minLon) minLon = lon; if (lat < minLat) minLat = lat;
              if (lon > maxLon) maxLon = lon; if (lat > maxLat) maxLat = lat;
            }
            window.eventBus.emit("openlayers:fitExtent", {
              extent: [minLon, minLat, maxLon, maxLat],
              rasterId: r.id,
            });
          }
        }
      };

      const handleShowProperties = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Close context menu
        setContextMenuOpen(null);

        if (layer.type === "point-cloud" && layer.data) {
          const pc = layer.data as PointCloud;
          setSelectedPointCloud(pc);

          // Get file size - try to get metadata.json size first, then try to calculate folder size
          try {
            const projectState = ProjectActions.getProjectState();
            if (projectState.project?.project.path && pc.asset) {
              const metadataPath = window.electronAPI.pathJoin(
                projectState.project.project.path,
                pc.path
              );
              const size = await window.electronAPI.getFileSize(metadataPath);
              setFileSize(size);
            }
          } catch (error) {
            console.error("Error getting file size:", error);
            setFileSize(null);
          }
        }
      };

      const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Close context menu
        setContextMenuOpen(null);

        if (layer.type === "point-cloud" && layer.data) {
          const pc = layer.data as PointCloud;
          PotreeService.deletePointCloud(pc.id);
        } else if (layer.type === "measurement" && layer.data && pointCloudId) {
          const measurementLayer = layer.data as MeasurementLayer;

          // Önce Redux'tan sil ki project güncellenince loadMeasurementLayers eski state ile tekrar yüklemesin
          ProjectActions.removeMeasurementLayer(
            pointCloudId,
            measurementLayer.id
          );
          // Sonra Potree'den kaldır (Redux güncel, ekrana tekrar gelmez)
          PotreeService.removeMeasurement(measurementLayer.id);
        } else if (layer.type === "annotation" && layer.data && pointCloudId) {
          // Önce Redux ve dosyadan sil, sonra Potree sahnesinden kaldır
          ProjectActions.removeAnnotationLayer(pointCloudId, layer.id);
          PotreeService.removeAnnotation(layer.id);
        }
      };

      return (
        <ContextMenu
          key={layer.id}
          open={contextMenuOpen === layer.id}
          onOpenChange={(open) => {
            if (!open) {
              setContextMenuOpen(null);
            } else {
              setContextMenuOpen(layer.id);
            }
          }}
        >
          <ContextMenuTrigger asChild>
            <div
              className={`flex items-center gap-1 hover:bg-accent rounded-sm cursor-pointer min-w-0 ${
                layer.type === "measurement" || layer.type === "annotation"
                  ? "py-0.5 px-1.5 text-[10px]"
                  : "py-1 px-2 text-xs"
              }`}
              style={{ justifyContent: "space-between" }}
            >
              <div
                className="gap-1"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                 {layer.type === "measurement" ? (
                   <MeasurementIcon 
                     className="h-2.5 w-2.5 text-yellow-400 flex-shrink-0" 
                     style={
                       layer.data && (layer.data as MeasurementLayer).icon === "RulerDimensionLine"
                         ? { transform: "rotate(90deg)" }
                         : undefined
                     }
                   />
                 ) : layer.type === "annotation" ? (
                   <LayersIcon className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                 ) : (
                   <LayersIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                 )}
                <span
                  className="truncate flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{
                    maxWidth: layer.type === "measurement" || layer.type === "annotation" ? "120px" : "126px",
                  }}
                >
                  {layer.name}
                </span>
              </div>

              {layer.id != "mesh-parent" &&
                layer.id != "point-cloud-parent" &&
                layer.id != "vector-parent" &&
                layer.id != "raster-parent" && (
                  <div
                    className="flex items-center"
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.stopPropagation()}
                  >
                    <div
                      className={`flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer ${
                        layer.type === "measurement" || layer.type === "annotation"
                          ? "h-5 w-5 p-0.5"
                          : "h-7 w-7 p-1.5"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleVisibility(layer.id, layer.type, pointCloudId);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.stopPropagation()}
                    >
                      {isVisible ? (
                        <Eye
                          className={
                            layer.type === "measurement" || layer.type === "annotation"
                              ? "h-2.5 w-2.5"
                              : "h-3 w-3"
                          }
                        />
                      ) : (
                        <EyeOff
                          className={`text-muted-foreground ${
                            layer.type === "measurement" || layer.type === "annotation"
                              ? "h-2.5 w-2.5"
                              : "h-3 w-3"
                          }`}
                        />
                      )}
                    </div>
                    {/* Show focus button for point clouds, meshes, rasters, measurements, annotations */}
                    {(layer.type === "point-cloud" ||
                      layer.type === "mesh" ||
                      layer.type === "raster" ||
                      layer.type === "measurement" ||
                      layer.type === "annotation") && (
                      <div
                        className={`flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer ${
                          layer.type === "measurement" || layer.type === "annotation"
                            ? "h-5 w-5 p-0.5"
                            : "h-7 w-7 p-1.5"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleLayerClick();
                        }}
                        onContextMenu={(e) => e.stopPropagation()}
                      >
                        <Scan
                          className={
                            layer.type === "measurement" || layer.type === "annotation"
                              ? "h-2.5 w-2.5"
                              : "h-3 w-3"
                          }
                        />
                      </div>
                    )}
                    {/* Color button for measurement layers */}
                    {layer.type === "measurement" && layer.data && (
                      <div
                        className="h-5 w-5 p-0.5 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer border border-border"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const measurementLayer = layer.data as MeasurementLayer;
                          const currentColor = measurementLayer.color || [1, 1, 0]; // Default yellow
                          // Get button position for popup
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setColorPickerPosition({ x: rect.left, y: rect.bottom + 4 });
                          setColorPickerOpen(layer.id);
                        }}
                        onContextMenu={(e) => e.stopPropagation()}
                        title="Change measurement color"
                      >
                        <div
                          className="w-full h-full rounded-sm"
                          style={{
                            backgroundColor: layer.data && (layer.data as MeasurementLayer).color
                              ? `rgb(${Math.round((layer.data as MeasurementLayer).color![0] * 255)}, ${Math.round((layer.data as MeasurementLayer).color![1] * 255)}, ${Math.round((layer.data as MeasurementLayer).color![2] * 255)})`
                              : "rgb(255, 255, 0)", // Default yellow
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>
          </ContextMenuTrigger>
          {/* Context menu: point-cloud = Properties + Delete, measurement = Delete only */}
          {layer.type === "point-cloud" && (
            <ContextMenuContent>
              <ContextMenuItem
                onClick={handleShowProperties}
                className="text-xs"
              >
                <Info className="mr-2 h-3 w-3" />
                Properties
              </ContextMenuItem>
              <ContextMenuItem
                onClick={handleDelete}
                className="text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          )}
          {layer.type === "measurement" && (
            <ContextMenuContent>
              <ContextMenuItem
                onClick={handleDelete}
                className="text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          )}
          {layer.type === "annotation" && (
            <ContextMenuContent>
              <ContextMenuItem
                onClick={handleDelete}
                className="text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          )}
        </ContextMenu>
      );
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto p-2">
        {layers.length > 0 ? (
          <div className="space-y-1">
            {layers.map((layer) => renderLayer(layer))}
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
            No layers found
          </div>
        )}
      </div>

      {/* Properties Panel */}
      {selectedPointCloud && (
        <div
          className="border-t border-border bg-[#1e1e1e] flex flex-col"
          style={{
            maxHeight: "40%",
            minHeight: "200px",
            zIndex: 1000,
            position: "relative",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Panel Header */}
          <div
            className="h-6 bg-[#262626] border-b border-[#404040] flex items-center justify-between px-2 flex-shrink-0"
            style={{ pointerEvents: "auto" }}
          >
            <span className="text-xs font-semibold text-[#e5e5e5]">
              Point Cloud Properties
            </span>
            <button
              onClick={() => {
                setSelectedPointCloud(null);
                setFileSize(null);
              }}
              className="h-5 w-5 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded-sm"
              style={{ pointerEvents: "auto" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Panel Content */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3"
            style={{
              pointerEvents: "auto",
              WebkitOverflowScrolling: "touch",
              zIndex: 1001,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Basic Info */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#e5e5e5] border-b border-[#404040] pb-1">
                Basic Information
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#a3a3a3]">Name:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {selectedPointCloud.name}
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">File Type:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {selectedPointCloud.fileType.toUpperCase()}
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Extension:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {selectedPointCloud.extension}
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">File Size:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {fileSize !== null
                      ? formatFileSize(fileSize)
                      : "Calculating..."}
                  </div>
                </div>
              </div>
            </div>

            {/* Point Cloud Stats */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#e5e5e5] border-b border-[#404040] pb-1">
                Point Cloud Statistics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#a3a3a3]">Number of Points:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {selectedPointCloud.numberOfPoints.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">ID:</span>
                  <div className="text-[#e5e5e5] font-medium text-[10px] font-mono truncate">
                    {selectedPointCloud.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Bounding Box */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#e5e5e5] border-b border-[#404040] pb-1">
                Bounding Box
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#a3a3a3]">Min (X, Y, Z):</span>
                  <div className="text-[#e5e5e5] font-medium font-mono text-[10px]">
                    ({selectedPointCloud.bbox.min.x.toFixed(2)},{" "}
                    {selectedPointCloud.bbox.min.y.toFixed(2)},{" "}
                    {selectedPointCloud.bbox.min.z.toFixed(2)})
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Max (X, Y, Z):</span>
                  <div className="text-[#e5e5e5] font-medium font-mono text-[10px]">
                    ({selectedPointCloud.bbox.max.x.toFixed(2)},{" "}
                    {selectedPointCloud.bbox.max.y.toFixed(2)},{" "}
                    {selectedPointCloud.bbox.max.z.toFixed(2)})
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Center (X, Y):</span>
                  <div className="text-[#e5e5e5] font-medium font-mono text-[10px]">
                    {(() => {
                      // Calculate center from bbox if center is 0,0
                      const centerX =
                        selectedPointCloud.center.x !== 0 ||
                        selectedPointCloud.center.y !== 0
                          ? selectedPointCloud.center.x
                          : (selectedPointCloud.bbox.min.x +
                              selectedPointCloud.bbox.max.x) /
                            2;
                      const centerY =
                        selectedPointCloud.center.x !== 0 ||
                        selectedPointCloud.center.y !== 0
                          ? selectedPointCloud.center.y
                          : (selectedPointCloud.bbox.min.y +
                              selectedPointCloud.bbox.max.y) /
                            2;

                      if (
                        centerX === 0 &&
                        centerY === 0 &&
                        selectedPointCloud.bbox.min.x === 0 &&
                        selectedPointCloud.bbox.max.x === 0
                      ) {
                        return (
                          <span className="text-[#a3a3a3]">Not available</span>
                        );
                      }
                      return `(${centerX.toFixed(2)}, ${centerY.toFixed(2)})`;
                    })()}
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Dimensions:</span>
                  <div className="text-[#e5e5e5] font-medium font-mono text-[10px]">
                    {(
                      selectedPointCloud.bbox.max.x -
                      selectedPointCloud.bbox.min.x
                    ).toFixed(2)}{" "}
                    ×{" "}
                    {(
                      selectedPointCloud.bbox.max.y -
                      selectedPointCloud.bbox.min.y
                    ).toFixed(2)}{" "}
                    ×{" "}
                    {(
                      selectedPointCloud.bbox.max.z -
                      selectedPointCloud.bbox.min.z
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Coordinate System */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#e5e5e5] border-b border-[#404040] pb-1">
                Coordinate System
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#a3a3a3]">EPSG Code:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {selectedPointCloud.epsg || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">EPSG Text:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {selectedPointCloud.epsgText || "N/A"}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[#a3a3a3]">PROJ4:</span>
                  <div className="text-[#e5e5e5] font-medium text-[10px] font-mono break-all">
                    {selectedPointCloud.proj4 || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Path Information */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#e5e5e5] border-b border-[#404040] pb-1">
                Path Information
              </div>
              <div className="text-xs">
                <span className="text-[#a3a3a3]">Asset Path:</span>
                <div className="text-[#e5e5e5] font-medium text-[10px] font-mono break-all mt-1">
                  {selectedPointCloud.asset}
                </div>
              </div>
              <div className="text-xs">
                <span className="text-[#a3a3a3]">Path:</span>
                <div className="text-[#e5e5e5] font-medium text-[10px] font-mono break-all mt-1">
                  {selectedPointCloud.path}
                </div>
              </div>
            </div>

            {/* DSM Info */}
            {selectedPointCloud.dsm && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#e5e5e5] border-b border-[#404040] pb-1">
                  DSM Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#a3a3a3]">Exists:</span>
                    <div className="text-[#e5e5e5] font-medium">
                      {selectedPointCloud.dsm.exist ? "Yes" : "No"}
                    </div>
                  </div>
                  {selectedPointCloud.dsm.exist && (
                    <>
                      <div>
                        <span className="text-[#a3a3a3]">Resolution:</span>
                        <div className="text-[#e5e5e5] font-medium">
                          {selectedPointCloud.dsm.res > 0
                            ? `${selectedPointCloud.dsm.res}`
                            : "N/A"}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#a3a3a3]">File:</span>
                        <div className="text-[#e5e5e5] font-medium text-[10px] font-mono break-all">
                          {selectedPointCloud.dsm.file || "N/A"}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Color Picker Popup */}
      {colorPickerOpen && colorPickerPosition && (
        <div
          ref={colorPickerRef}
          className="fixed bg-popover border border-border rounded-md shadow-lg p-3 z-[9999]"
          style={{
            left: `${colorPickerPosition.x}px`,
            top: `${colorPickerPosition.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold mb-2">Select Color</div>
          <div className="grid grid-cols-9 gap-1">
            {/* Common colors palette */}
            {[
              { r: 1, g: 1, b: 0 }, // Yellow
              { r: 1, g: 0, b: 0 }, // Red
              { r: 0, g: 1, b: 0 }, // Green
              { r: 0, g: 0, b: 1 }, // Blue
              { r: 1, g: 0.5, b: 0 }, // Orange
              { r: 1, g: 0, b: 1 }, // Magenta
              { r: 0, g: 1, b: 1 }, // Cyan
              { r: 1, g: 1, b: 1 }, // White
              { r: 0, g: 0, b: 0 }, // Black
            ].map((color, index) => (
              <button
                key={index}
                className="w-6 h-6 rounded-sm border border-border hover:scale-110 transition-transform cursor-pointer"
                style={{
                  backgroundColor: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (colorPickerOpen && project) {
                    const currentState = ProjectActions.getProjectState();
                    const allPointClouds = currentState.project?.metadata.pointCloud || [];
                    
                    // Find the measurement layer
                    for (const pc of allPointClouds) {
                      const measurementLayer = pc.layers?.find((l) => l.id === colorPickerOpen && l.type === "measurement");
                      if (measurementLayer) {
                        const newColor = [color.r, color.g, color.b] as [number, number, number];
                        PotreeService.updateMeasurementColor(pc.id, colorPickerOpen, newColor);
                        break;
                      }
                    }
                  }
                  setColorPickerOpen(null);
                  setColorPickerPosition(null);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

Layers.displayName = "Layers";

export default Layers;
