import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Layers as LayersIcon, Eye, EyeOff, Settings, Trash2 } from 'lucide-react';
import { RootState } from '../../store/store';
import { PointCloud, Mesh, Orthophoto } from '../../types/ProjectTypes';
import PotreeService from '../../services/PotreeService';

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
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Convert project metadata to Layer structure
  const layers = useMemo<Layer[]>(() => {
    if (!project?.metadata) {
      return [];
    }

    const { pointCloud, mesh, orthophoto, dsm, dtm } = project.metadata;

    const layersArray: Layer[] = [];

    // Point Cloud Layer
    if (pointCloud && pointCloud.length > 0) {
      layersArray.push({
        id: 'point-cloud-parent',
        name: 'Point Cloud Layer',
        visible: layerVisibility['point-cloud-parent'] !== false,
        type: 'point-cloud',
        children: pointCloud.map((pc) => ({
          id: pc.id,
          name: pc.name,
          visible: layerVisibility[pc.id] !== false,
          type: 'point-cloud',
          data: pc,
        })),
      });
    }

    // Mesh Layer
    if (mesh && mesh.length > 0) {
      layersArray.push({
        id: 'mesh-parent',
        name: 'Mesh Layer',
        visible: layerVisibility['mesh-parent'] !== false,
        type: 'mesh',
        children: mesh.map((m) => ({
          id: m.id,
          name: m.name,
          visible: layerVisibility[m.id] !== false,
          type: 'mesh',
          data: m,
        })),
      });
    }

    // Vector Layer (Orthophoto, DSM, DTM)
    const vectorChildren: Layer[] = [];
    
    if (orthophoto && orthophoto.length > 0) {
      vectorChildren.push(
        ...orthophoto.map((ortho) => ({
          id: ortho.id,
          name: ortho.name,
          visible: layerVisibility[ortho.id] !== false,
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
          visible: layerVisibility[d.id] !== false,
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
          visible: layerVisibility[d.id] !== false,
          type: 'dtm' as const,
          data: d,
        }))
      );
    }

    if (vectorChildren.length > 0) {
      layersArray.push({
        id: 'vector-parent',
        name: 'Vector Layer',
        visible: layerVisibility['vector-parent'] !== false,
        type: 'orthophoto',
        children: vectorChildren,
      });
    }

    return layersArray;
  }, [project?.metadata, layerVisibility]);

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

  const toggleVisibility = (layerId: string) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerId]: prev[layerId] === undefined ? false : !prev[layerId],
    }));
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
    const isVisible = layerVisibility[layer.id] !== false; // Default to true if not set

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
                      toggleVisibility(layer.id);
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

      return (
        <div
          key={layer.id}
          className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-sm text-xs cursor-pointer"
          onClick={handleLayerClick}
        >
          <LayersIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{layer.name}</span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <div
              className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
              onClick={() => toggleVisibility(layer.id)}
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
            <div
              className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer text-destructive hover:text-destructive"
              onClick={() => {
                // Delete action
              }}
            >
              <Trash2 className="h-3 w-3" />
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="w-full h-full overflow-auto p-2">
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
  );
});

Layers.displayName = 'Layers';

export default Layers;