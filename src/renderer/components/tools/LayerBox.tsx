import React, { useState, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { Layers as LayersIcon, Eye, EyeOff, Settings, X, Info, Trash2 } from 'lucide-react';
import { RootState } from '../../store/store';
import { PointCloud, Mesh, Orthophoto } from '../../types/ProjectTypes';
import PotreeService from '../../services/PotreeService';
import ProjectActions from '../../store/actions/ProjectActions';
import PointCloudService from '../../services/PointCloudService';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  type: 'point-cloud' | 'mesh' | 'orthophoto' | 'dsm' | 'dtm';
  data?: PointCloud | Mesh | Orthophoto;
  children?: Layer[];
}

export interface LayersRef {
  expandAll: () => void;
  collapseAll: () => void;
}

interface LayersProps {}

const Layers = forwardRef<LayersRef, LayersProps>((props, ref) => {
  const project = useSelector((state: RootState) => state.projectReducer.project);
  // Note: layerVisibility is now managed through pointCloud.visible in Redux
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedPointCloud, setSelectedPointCloud] = useState<PointCloud | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState<string | null>(null);

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

        const assetPath = window.electronAPI.pathJoin(project.project.path, pc.asset);
        
        try {
          // Check if asset file exists
          await window.electronAPI.readProjectXML(assetPath);
          valid.push(pc);
        } catch (error) {
          console.warn(`Point cloud asset not found, removing from LayerBox: ${assetPath}`);
          // Asset doesn't exist, skip
        }
      }
      
      setValidPointClouds(valid);
    };

    validatePointClouds();
  }, [project?.metadata?.pointCloud, project?.project?.path]);

  // Convert project metadata to Layer structure
  const layers = useMemo<Layer[]>(() => {
    const { mesh, orthophoto, dsm, dtm } = project?.metadata || {};

    const layersArray: Layer[] = [];

    // Point Cloud Layer - always show, even if empty
    layersArray.push({
      id: 'point-cloud-parent',
      name: 'Point Cloud Layer',
      visible: true, // Parent layers are always visible
      type: 'point-cloud',
      children: (validPointClouds && validPointClouds.length > 0) 
        ? validPointClouds.map((pc) => ({
            id: pc.id,
            name: pc.name,
            visible: pc.visible !== false, // Use pointCloud.visible from Redux
            type: 'point-cloud',
            data: pc,
          }))
        : [],
    });

    // Mesh Layer - always show, even if empty
    layersArray.push({
      id: 'mesh-parent',
      name: 'Mesh Layer',
      visible: true, // Parent layers are always visible
      type: 'mesh',
      children: (mesh && mesh.length > 0)
        ? mesh.map((m) => ({
            id: m.id,
            name: m.name,
            visible: true, // Default to true for other layer types
            type: 'mesh',
            data: m,
          }))
        : [],
    });

    // Vector Layer (Orthophoto, DSM, DTM) - always show, even if empty
    const vectorChildren: Layer[] = [];
    console.error(orthophoto, dsm, dtm);
    if (orthophoto && orthophoto.length > 0) {
      vectorChildren.push(
        ...orthophoto.map((ortho) => ({
          id: ortho.id,
          name: ortho.name,
          visible: true, // Default to true for other layer types
          type: 'orthophoto' as const,
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
          type: 'dsm' as const,
          data: d,
        }))
      );
    }

    if (dtm && dtm.length > 0) {
      vectorChildren.push(
        ...dtm.map((d) => ({
          id: d.id,
          name: d.name,
          visible: true, // Default to true for other layer types
          type: 'dtm' as const,
          data: d,
        }))
      );
    }

    // Always show Vector Layer, even if empty
    layersArray.push({
      id: 'vector-parent',
      name: 'Vector Layer',
      visible: true, // Parent layers are always visible
      type: 'orthophoto',
      children: vectorChildren,
    });

    return layersArray;
  }, [project?.metadata, validPointClouds]);

  // Get all layer IDs that have children
  const getAllLayerIdsWithChildren = (items: Layer[]): string[] => {
    const ids: string[] = [];
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        ids.push(item.id);
        ids.push(...getAllLayerIdsWithChildren(item.children));
      }
    });
    return ids;
  };

  // Expose expand/collapse functions via ref
  useImperativeHandle(ref, () => ({
    expandAll: () => {
      const allIds = getAllLayerIdsWithChildren(layers);
      setExpandedItems(allIds);
    },
    collapseAll: () => {
      setExpandedItems([]);
    },
  }), [layers]);

  const toggleVisibility = (layerId: string, layerType: string) => {
    if (layerType === 'point-cloud') {
      // Get current visibility from Redux
      const currentState = ProjectActions.getProjectState();
      const pointCloud = currentState.project?.metadata.pointCloud?.find((pc) => pc.id === layerId);
      const currentVisible = pointCloud?.visible !== false; // Default to true
      
      // Toggle visibility using PointCloudService
      PointCloudService.pointCloudVisibility(layerId, !currentVisible);
    } else {
      // For other layer types, use local state (if needed in future)
      // For now, just log
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

  const renderLayer = (layer: Layer, level: number = 0): React.ReactNode => {
    const hasChildren = layer.children && layer.children.length > 0;
    // For point clouds, get visibility from Redux; for others, default to true
    const isVisible = layer.type === 'point-cloud' && layer.data
      ? (layer.data as PointCloud).visible !== false
      : true;

    if (hasChildren) {
      const isExpanded = expandedItems.includes(layer.id);
      return (
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
            <AccordionTrigger className="py-1 px-2 hover:bg-accent rounded-sm text-xs">
              <div className="flex items-center gap-2 flex-1 text-left">
                <LayersIcon className="h-3 w-3 text-blue-400 flex-shrink-0" />
                <span className="truncate flex-1">{layer.name}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(layer.id, layer.type);
                    }}
                  >
                    {isVisible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div
                    className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Settings action
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pt-0">
              <div className="pl-4">
                {layer.children!.map((child) => renderLayer(child, level + 1))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    } else {
      const handleLayerClick = () => {
        // If it's a point cloud, focus to it
        if (layer.type === 'point-cloud' && layer.data) {
          PotreeService.focusToPointCloud(layer.id);
        }
      };

      const handleShowProperties = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close context menu
        setContextMenuOpen(null);
        
        if (layer.type === 'point-cloud' && layer.data) {
          const pc = layer.data as PointCloud;
          setSelectedPointCloud(pc);
          
          // Get file size - try to get metadata.json size first, then try to calculate folder size
          try {
            const projectState = ProjectActions.getProjectState();
            if (projectState.project?.project.path && pc.asset) {
              const metadataPath = window.electronAPI.pathJoin(projectState.project.project.path, pc.path);
              const size = await window.electronAPI.getFileSize(metadataPath);
              setFileSize(size);
            }
          } catch (error) {
            console.error('Error getting file size:', error);
            setFileSize(null);
          }
        }
      };

      const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close context menu
        setContextMenuOpen(null);
        
        if (layer.type === 'point-cloud' && layer.data) {
          const pc = layer.data as PointCloud;
          
          // Remove from Potree viewer
          PotreeService.deletePointCloud(pc.id);
          
          // Remove from Redux store
          ProjectActions.deletePointCloud(pc.id);
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
              className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-sm text-xs cursor-pointer"
              onDoubleClick={handleLayerClick}
            >
              <LayersIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1">{layer.name}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <div
                  className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
                  onClick={() => toggleVisibility(layer.id, layer.type)}
                >
                  {isVisible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div
                  className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
                  onClick={() => {
                    // Settings action
                  }}
                >
                  <Settings className="h-3 w-3" />
                </div>
              </div>
            </div>
          </ContextMenuTrigger>
          {layer.type === 'point-cloud' && (
            <ContextMenuContent>
              <ContextMenuItem onClick={handleShowProperties} className="text-xs">
                <Info className="mr-2 h-3 w-3" />
                Properties
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDelete} className="text-xs text-destructive focus:text-destructive">
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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
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
            maxHeight: '40%', 
            minHeight: '200px',
            zIndex: 1000,
            position: 'relative'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Panel Header */}
          <div 
            className="h-6 bg-[#262626] border-b border-[#404040] flex items-center justify-between px-2 flex-shrink-0"
            style={{ pointerEvents: 'auto' }}
          >
            <span className="text-xs font-semibold text-[#e5e5e5]">Point Cloud Properties</span>
            <button
              onClick={() => {
                setSelectedPointCloud(null);
                setFileSize(null);
              }}
              className="h-5 w-5 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded-sm"
              style={{ pointerEvents: 'auto' }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          
          {/* Panel Content */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3" 
            style={{ 
              pointerEvents: 'auto', 
              WebkitOverflowScrolling: 'touch',
              zIndex: 1001
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
                  <div className="text-[#e5e5e5] font-medium">{selectedPointCloud.name}</div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">File Type:</span>
                  <div className="text-[#e5e5e5] font-medium">{selectedPointCloud.fileType.toUpperCase()}</div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Extension:</span>
                  <div className="text-[#e5e5e5] font-medium">{selectedPointCloud.extension}</div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">File Size:</span>
                  <div className="text-[#e5e5e5] font-medium">
                    {fileSize !== null ? formatFileSize(fileSize) : 'Calculating...'}
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
                    ({selectedPointCloud.bbox.min.x.toFixed(2)}, {selectedPointCloud.bbox.min.y.toFixed(2)}, {selectedPointCloud.bbox.min.z.toFixed(2)})
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Max (X, Y, Z):</span>
                  <div className="text-[#e5e5e5] font-medium font-mono text-[10px]">
                    ({selectedPointCloud.bbox.max.x.toFixed(2)}, {selectedPointCloud.bbox.max.y.toFixed(2)}, {selectedPointCloud.bbox.max.z.toFixed(2)})
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Center (X, Y):</span>
                  <div className="text-[#e5e5e5] font-medium font-mono text-[10px]">
                    {(() => {
                      // Calculate center from bbox if center is 0,0
                      const centerX = selectedPointCloud.center.x !== 0 || selectedPointCloud.center.y !== 0 
                        ? selectedPointCloud.center.x 
                        : (selectedPointCloud.bbox.min.x + selectedPointCloud.bbox.max.x) / 2;
                      const centerY = selectedPointCloud.center.x !== 0 || selectedPointCloud.center.y !== 0 
                        ? selectedPointCloud.center.y 
                        : (selectedPointCloud.bbox.min.y + selectedPointCloud.bbox.max.y) / 2;
                      
                      if (centerX === 0 && centerY === 0 && selectedPointCloud.bbox.min.x === 0 && selectedPointCloud.bbox.max.x === 0) {
                        return <span className="text-[#a3a3a3]">Not available</span>;
                      }
                      return `(${centerX.toFixed(2)}, ${centerY.toFixed(2)})`;
                    })()}
                  </div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">Dimensions:</span>
                  <div className="text-[#e5e5e5] font-medium font-mono text-[10px]">
                    {((selectedPointCloud.bbox.max.x - selectedPointCloud.bbox.min.x).toFixed(2))} × {((selectedPointCloud.bbox.max.y - selectedPointCloud.bbox.min.y).toFixed(2))} × {((selectedPointCloud.bbox.max.z - selectedPointCloud.bbox.min.z).toFixed(2))}
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
                  <div className="text-[#e5e5e5] font-medium">{selectedPointCloud.epsg || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[#a3a3a3]">EPSG Text:</span>
                  <div className="text-[#e5e5e5] font-medium">{selectedPointCloud.epsgText || 'N/A'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-[#a3a3a3]">PROJ4:</span>
                  <div className="text-[#e5e5e5] font-medium text-[10px] font-mono break-all">
                    {selectedPointCloud.proj4 || 'N/A'}
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
                      {selectedPointCloud.dsm.exist ? 'Yes' : 'No'}
                    </div>
                  </div>
                  {selectedPointCloud.dsm.exist && (
                    <>
                      <div>
                        <span className="text-[#a3a3a3]">Resolution:</span>
                        <div className="text-[#e5e5e5] font-medium">
                          {selectedPointCloud.dsm.res > 0 ? `${selectedPointCloud.dsm.res}` : 'N/A'}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#a3a3a3]">File:</span>
                        <div className="text-[#e5e5e5] font-medium text-[10px] font-mono break-all">
                          {selectedPointCloud.dsm.file || 'N/A'}
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
    </div>
  );
});

Layers.displayName = 'Layers';

export default Layers;