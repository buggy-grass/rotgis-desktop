import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Cloud, Box, Layers, FileUp, FolderOpen } from "lucide-react";
import { Input } from "../ui/input";

type LayerType = "point-cloud" | "mesh" | "vector" | "raster";

interface LayerTypeOption {
  value: LayerType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  extensions: string[];
}

const layerTypes: LayerTypeOption[] = [
  {
    value: "point-cloud",
    label: "Point Cloud Layer",
    icon: Cloud,
    extensions: [".las", ".laz"],
  },
  {
    value: "mesh",
    label: "Mesh Layer",
    icon: Box,
    extensions: [".obj"],
  },
  {
    value: "raster",
    label: "Raster Layer",
    icon: Box,
    extensions: [".tif"],
  },
  {
    value: "vector",
    label: "Vector Layer",
    icon: Layers,
    extensions: [".shp", ".geojson", ".kml", ".kmz", ".dxf"],
  },
];

interface AddLayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (layerType: LayerType, filePath: string) => void;
}

const AddLayerDialog: React.FC<AddLayerDialogProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [selectedLayerType, setSelectedLayerType] =
    useState<LayerType>("point-cloud");
  const [filePath, setFilePath] = useState<string>("");

  const selectedLayer = layerTypes.find((lt) => lt.value === selectedLayerType);

  const handleFileSelect = async () => {
    try {
      if (!window.electronAPI?.showFilePicker) {
        console.error("File picker API not available");
        return;
      }

      const result = await window.electronAPI.showFilePicker({
        filters: [
          {
            name: selectedLayer?.label || "Files",
            extensions:
              selectedLayer?.extensions.map((ext) => ext.substring(1)) || [],
          },
          {
            name: "All Files",
            extensions: ["*"],
          },
        ],
        title: `Select ${selectedLayer?.label || "File"}`,
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setFilePath(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  };

  const handleImport = () => {
    if (filePath) {
      onImport(selectedLayerType, filePath);
      setFilePath("");
      onOpenChange(false);
      setSelectedLayerType("point-cloud");
    }
  };

  const handleClose = () => {
    setFilePath("");
    onOpenChange(false);
    setSelectedLayerType("point-cloud");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl"
        title="Add New Layer"
        showCloseButton
      >
        <DialogHeader>
          <DialogDescription className="text-sm" style={{ color: "#a3a3a3" }}>
            Select a layer type and choose a file to import
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 mt-4" style={{ minHeight: "400px" }}>
          {/* Left Panel - Layer Type Selection */}
          <div
            className="flex flex-col gap-2"
            style={{
              width: "240px",
              borderRight: "1px solid #404040",
              paddingRight: "16px",
            }}
          >
            <Label className="text-xs text-muted-foreground mb-2">
              Layer Type
            </Label>
            {layerTypes.map((layerType) => {
              const Icon = layerType.icon;
              const isSelected = selectedLayerType === layerType.value;
              return (
                <button
                  key={layerType.value}
                  onClick={() => {
                    setSelectedLayerType(layerType.value);
                    setFilePath(""); // Reset file path when layer type changes
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent hover:bg-accent text-foreground border border-transparent hover:border-border"
                  }`}
                  style={{
                    border: isSelected
                      ? "1px solid #3b82f6"
                      : "1px solid #404040",
                    background: isSelected ? "#3b82f6" : "transparent",
                    color: isSelected ? "#ffffff" : "#e5e5e5",
                  }}
                >
                  <Icon
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">{layerType.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Panel - File Selection */}
          <div className="flex-1 flex flex-col">
            <Label className="text-xs mb-2" style={{ color: "#a3a3a3" }}>
              File Selection
            </Label>
            <div className="flex flex-col gap-4 flex-1">
              {/* Supported Extensions */}
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "#a3a3a3" }}>
                  Supported Formats
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLayer?.extensions.map((ext) => (
                    <span
                      key={ext}
                      className="px-2 py-1 text-xs rounded border"
                      style={{
                        background: "#262626",
                        color: "#a3a3a3",
                        border: "1px solid #404040",
                      }}
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

              {/* File Path Input */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs" style={{ color: "#a3a3a3" }}>
                  File Path
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={filePath}
                    readOnly
                    placeholder="No file selected"
                    className="flex-1 bg-background border-border text-foreground"
                    style={{
                      background: "#262626",
                      border: "1px solid #404040",
                      color: "#e5e5e5",
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFileSelect}
                    className="flex items-center gap-2"
                    style={{
                      border: "1px solid #404040",
                      background: "#262626",
                      color: "#e5e5e5",
                    }}
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Browse</span>
                  </Button>
                </div>
              </div>

              {/* File Info */}
              {filePath && (
                <div
                  className="p-3 rounded-md border"
                  style={{
                    background: "#262626",
                    border: "1px solid #404040",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <FileUp className="h-4 w-4 mt-0.5" style={{ color: "#a3a3a3" }} />
                    <div className="flex-1">
                      <Label className="text-xs block mb-1" style={{ color: "#a3a3a3" }}>
                        Selected File
                      </Label>
                      <p className="text-sm break-all" style={{ color: "#e5e5e5" }}>
                        {filePath}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            style={{
              border: "1px solid #404040",
              background: "#262626",
              color: "#e5e5e5",
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!filePath}
            style={{
              background: filePath ? "#3b82f6" : "#404040",
              color: "#ffffff",
            }}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddLayerDialog;
