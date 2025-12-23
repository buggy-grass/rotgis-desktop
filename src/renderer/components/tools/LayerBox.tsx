import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Layers as LayersIcon, Eye, EyeOff, Settings, Trash2 } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  children?: Layer[];
}

function Layers() {
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: '1',
      name: 'Point Cloud Layer',
      visible: true,
      children: [
        {
          id: '1-1',
          name: 'Sub Layer 1',
          visible: true,
        },
        {
          id: '1-2',
          name: 'Sub Layer 2',
          visible: false,
        },
      ],
    },
    {
      id: '2',
      name: 'Mesh Layer',
      visible: true,
      children: [
        {
          id: '2-1',
          name: 'Mesh Sub Layer 1',
          visible: true,
        },
      ],
    },
    {
      id: '3',
      name: 'Vector Layer',
      visible: false,
    },
  ]);

  const toggleVisibility = (layerId: string) => {
    const updateLayer = (items: Layer[]): Layer[] => {
      return items.map((item) => {
        if (item.id === layerId) {
          return { ...item, visible: !item.visible };
        }
        if (item.children) {
          return { ...item, children: updateLayer(item.children) };
        }
        return item;
      });
    };
    setLayers(updateLayer(layers));
  };

  const renderLayer = (layer: Layer, level: number = 0): React.ReactNode => {
    const hasChildren = layer.children && layer.children.length > 0;

    if (hasChildren) {
      return (
        <Accordion
          key={layer.id}
          type="single"
          collapsible
          className="w-full"
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
                    {layer.visible ? (
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
      return (
        <div
          key={layer.id}
          className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-sm text-xs"
        >
          <LayersIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{layer.name}</span>
          <div className="flex items-center gap-1">
            <div
              className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-accent cursor-pointer"
              onClick={() => toggleVisibility(layer.id)}
            >
              {layer.visible ? (
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
}

export default Layers;