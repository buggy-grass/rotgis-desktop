import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import PotreeService from "../../services/PotreeService";

interface PotreeViewerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ViewerOptions {
  pointDensity: number;
  fieldOfView: number;
  radius: number;
  edlStrength: number;
  edleOpacity: number;
  background: string;
  nodeSize: number;
  edle: boolean;
  pointHQ: boolean;
  pointSizeType: number;
}

const PotreeViewerSettingsDialog: React.FC<PotreeViewerSettingsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [options, setOptions] = useState<ViewerOptions>({
    pointDensity: 1000000,
    fieldOfView: 60,
    radius: 1.0,
    edlStrength: 1.0,
    edleOpacity: 1.0,
    background: "gradient-grid",
    nodeSize: 30,
    edle: false,
    pointHQ: false,
    pointSizeType: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load current options when dialog opens
  useEffect(() => {
    if (open && window.viewer) {
      loadCurrentOptions();
    }
  }, [open]);

  const loadCurrentOptions = async () => {
    try {
      setIsLoading(true);
      const currentOptions = await PotreeService.getCurrentViewerOptions();
      setOptions(currentOptions);
    } catch (error) {
      console.error("Error loading viewer options:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = (key: keyof ViewerOptions, value: number) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    applyOption(key, value);
  };

  const handleSwitchChange = (key: keyof ViewerOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    applyOption(key, value);
  };

  const handleSelectChange = (key: keyof ViewerOptions, value: string | number) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    applyOption(key, value);
  };

  const applyOption = (key: keyof ViewerOptions, value: any) => {
    if (!window.viewer) return;

    switch (key) {
      case "pointDensity":
        PotreeService.setPointBudget(value);
        break;
      case "fieldOfView":
        PotreeService.setFieldofView(value);
        break;
      case "radius":
        PotreeService.setRadius(value);
        break;
      case "edlStrength":
        PotreeService.setEDLStrength(value);
        break;
      case "edleOpacity":
        PotreeService.setEdleOpacity(value);
        break;
      case "background":
        window.viewer.setBackground(value);
        break;
      case "nodeSize":
        PotreeService.setNodeSize(value);
        break;
      case "edle":
        PotreeService.setEdle(value);
        break;
      case "pointHQ":
        PotreeService.setQuality(value);
        break;
      case "pointSizeType":
        PotreeService.setPointSizeTypes(value);
        break;
    }
  };

  const backgroundOptions = [
    { value: "gradient-grid", label: "Gradient Grid" },
    { value: "skybox", label: "Skybox" },
    { value: "black", label: "Black" },
    { value: "white", label: "White" },
  ];

  const pointSizeTypeOptions = [
    { value: 0, label: "Fixed" },
    { value: 1, label: "Attenuated" },
    { value: 2, label: "Adaptive" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay />
      <DialogContent
        title="Potree Viewer Settings"
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          background: "#1e1e1e",
          border: "1px solid #404040",
        }}
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Point Density */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pointDensity" className="text-sm font-medium text-[#e5e5e5]">
                Point Density
              </Label>
              <span className="text-xs text-[#a3a3a3]">{options.pointDensity.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                id="pointDensity"
                type="range"
                min="100000"
                max="10000000"
                step="100000"
                value={options.pointDensity}
                onChange={(e) => handleSliderChange("pointDensity", parseInt(e.target.value))}
                className="flex-1 h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #404040 0%, #404040 ${((options.pointDensity - 100000) / (10000000 - 100000)) * 100}%, #262626 ${((options.pointDensity - 100000) / (10000000 - 100000)) * 100}%, #262626 100%)`,
                }}
              />
              <Input
                type="number"
                min="100000"
                max="10000000"
                step="100000"
                value={options.pointDensity}
                onChange={(e) => handleSliderChange("pointDensity", parseInt(e.target.value) || 100000)}
                className="w-24 h-8 text-sm bg-[#262626] border-[#404040] text-[#e5e5e5]"
              />
            </div>
          </div>

          {/* Field of View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fieldOfView" className="text-sm font-medium text-[#e5e5e5]">
                Field of View
              </Label>
              <span className="text-xs text-[#a3a3a3]">{options.fieldOfView}°</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                id="fieldOfView"
                type="range"
                min="30"
                max="120"
                step="1"
                value={options.fieldOfView}
                onChange={(e) => handleSliderChange("fieldOfView", parseInt(e.target.value))}
                className="flex-1 h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #404040 0%, #404040 ${((options.fieldOfView - 30) / (120 - 30)) * 100}%, #262626 ${((options.fieldOfView - 30) / (120 - 30)) * 100}%, #262626 100%)`,
                }}
              />
              <Input
                type="number"
                min="30"
                max="120"
                step="1"
                value={options.fieldOfView}
                onChange={(e) => handleSliderChange("fieldOfView", parseInt(e.target.value) || 30)}
                className="w-20 h-8 text-sm bg-[#262626] border-[#404040] text-[#e5e5e5]"
              />
            </div>
          </div>

          {/* Node Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="nodeSize" className="text-sm font-medium text-[#e5e5e5]">
                Node Size
              </Label>
              <span className="text-xs text-[#a3a3a3]">{options.nodeSize}</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                id="nodeSize"
                type="range"
                min="1"
                max="100"
                step="1"
                value={options.nodeSize}
                onChange={(e) => handleSliderChange("nodeSize", parseInt(e.target.value))}
                className="flex-1 h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #404040 0%, #404040 ${((options.nodeSize - 1) / (100 - 1)) * 100}%, #262626 ${((options.nodeSize - 1) / (100 - 1)) * 100}%, #262626 100%)`,
                }}
              />
              <Input
                type="number"
                min="1"
                max="100"
                step="1"
                value={options.nodeSize}
                onChange={(e) => handleSliderChange("nodeSize", parseInt(e.target.value) || 1)}
                className="w-20 h-8 text-sm bg-[#262626] border-[#404040] text-[#e5e5e5]"
              />
            </div>
          </div>

          {/* EDL Settings */}
          <div className="space-y-4 border-t border-[#404040] pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#e5e5e5]">EDL (Eye-Dome Lighting)</Label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.edle}
                  onChange={(e) => handleSwitchChange("edle", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#262626] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#404040] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#404040]"></div>
              </label>
            </div>

            {options.edle && (
              <>
                {/* EDL Radius */}
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="radius" className="text-sm font-medium text-[#a3a3a3]">
                      EDL Radius
                    </Label>
                    <span className="text-xs text-[#a3a3a3]">{options.radius.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      id="radius"
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={options.radius}
                      onChange={(e) => handleSliderChange("radius", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #404040 0%, #404040 ${((options.radius - 0.1) / (5.0 - 0.1)) * 100}%, #262626 ${((options.radius - 0.1) / (5.0 - 0.1)) * 100}%, #262626 100%)`,
                      }}
                    />
                    <Input
                      type="number"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={options.radius}
                      onChange={(e) => handleSliderChange("radius", parseFloat(e.target.value) || 0.1)}
                      className="w-20 h-8 text-sm bg-[#262626] border-[#404040] text-[#e5e5e5]"
                    />
                  </div>
                </div>

                {/* EDL Strength */}
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edlStrength" className="text-sm font-medium text-[#a3a3a3]">
                      EDL Strength
                    </Label>
                    <span className="text-xs text-[#a3a3a3]">{options.edlStrength.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      id="edlStrength"
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={options.edlStrength}
                      onChange={(e) => handleSliderChange("edlStrength", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #404040 0%, #404040 ${((options.edlStrength - 0.1) / (5.0 - 0.1)) * 100}%, #262626 ${((options.edlStrength - 0.1) / (5.0 - 0.1)) * 100}%, #262626 100%)`,
                      }}
                    />
                    <Input
                      type="number"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={options.edlStrength}
                      onChange={(e) => handleSliderChange("edlStrength", parseFloat(e.target.value) || 0.1)}
                      className="w-20 h-8 text-sm bg-[#262626] border-[#404040] text-[#e5e5e5]"
                    />
                  </div>
                </div>

                {/* EDL Opacity */}
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edleOpacity" className="text-sm font-medium text-[#a3a3a3]">
                      EDL Opacity
                    </Label>
                    <span className="text-xs text-[#a3a3a3]">{options.edleOpacity.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      id="edleOpacity"
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={options.edleOpacity}
                      onChange={(e) => handleSliderChange("edleOpacity", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #404040 0%, #404040 ${(options.edleOpacity / 1.0) * 100}%, #262626 ${(options.edleOpacity / 1.0) * 100}%, #262626 100%)`,
                      }}
                    />
                    <Input
                      type="number"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={options.edleOpacity}
                      onChange={(e) => handleSliderChange("edleOpacity", parseFloat(e.target.value) || 0.0)}
                      className="w-20 h-8 text-sm bg-[#262626] border-[#404040] text-[#e5e5e5]"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Background */}
          <div className="space-y-2 border-t border-[#404040] pt-4">
            <Label htmlFor="background" className="text-sm font-medium text-[#e5e5e5]">
              Background
            </Label>
            <select
              id="background"
              value={options.background}
              onChange={(e) => handleSelectChange("background", e.target.value)}
              className="w-full h-9 px-3 bg-[#262626] border border-[#404040] text-[#e5e5e5] text-sm rounded-sm focus:outline-none focus:ring-1 focus:ring-[#404040]"
            >
              {backgroundOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Point Quality */}
          <div className="space-y-2 border-t border-[#404040] pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#e5e5e5]">High Quality Points</Label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.pointHQ}
                  onChange={(e) => handleSwitchChange("pointHQ", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#262626] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#404040] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#404040]"></div>
              </label>
            </div>
          </div>

          {/* Point Size Type */}
          <div className="space-y-2 border-t border-[#404040] pt-4">
            <Label htmlFor="pointSizeType" className="text-sm font-medium text-[#e5e5e5]">
              Point Size Type
            </Label>
            <select
              id="pointSizeType"
              value={options.pointSizeType}
              onChange={(e) => handleSelectChange("pointSizeType", parseInt(e.target.value))}
              className="w-full h-9 px-3 bg-[#262626] border border-[#404040] text-[#e5e5e5] text-sm rounded-sm focus:outline-none focus:ring-1 focus:ring-[#404040]"
            >
              {pointSizeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PotreeViewerSettingsDialog;

