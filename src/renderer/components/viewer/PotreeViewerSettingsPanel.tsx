import React, { useState, useEffect, useRef } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import PotreeService from "../../services/PotreeService";
import { X } from "lucide-react";

interface PotreeViewerSettingsPanelProps {
  open: boolean;
  onClose: () => void;
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

const PotreeViewerSettingsPanel: React.FC<PotreeViewerSettingsPanelProps> = ({
  open,
  onClose,
}) => {
  const [options, setOptions] = useState<ViewerOptions>({
    pointDensity: 10000000,
    fieldOfView: 60,
    radius: 0.8,
    edlStrength: 0.4,
    edleOpacity: 1.0,
    background: "gradient-grid",
    nodeSize: 80,
    edle: true,
    pointHQ: false,
    pointSizeType: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load current options when panel opens
  useEffect(() => {
    if (open && window.viewer) {
      loadCurrentOptions();
    }
  }, [open]);

  // Note: Click outside is disabled - menu only closes with X button

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
    { value: 1, label: "Annuated" },
    { value: 2, label: "Adaptive" },
  ];

  const handleResetToDefaults = () => {
    PotreeService.setDefaultViewerOptions();
    loadCurrentOptions();
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-0.8 left-15 w-100 bg-[#1e1e1e] border border-[#404040] shadow-xl z-50 pointer-events-auto"
      style={{
        maxHeight: "40vh",
        overflowY: "auto",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(64, 64, 64, 0.5)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Panel Header */}
      <div className="h-6 bg-[#262626] border-b border-[#404040] flex items-center justify-between px-2.5 flex-shrink-0 sticky top-0 z-10 shadow-sm">
        <span className="text-xs font-semibold text-[#e5e5e5] tracking-wide">Viewer Settings</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetToDefaults}
            className="h-5 px-2 text-[10px] font-medium bg-[#2a2a2a] hover:bg-[#404040] text-[#e5e5e5] rounded border border-[#404040] transition-all duration-150 active:scale-95"
            title="Reset to defaults"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="h-5 w-5 flex items-center justify-center hover:bg-[#404040] rounded transition-colors duration-150 active:scale-95"
            title="Close"
          >
            <X className="h-3 w-3 text-[#e5e5e5]" />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="p-2.5 space-y-3">
        {/* Point Density */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pointDensity" className="text-[10px] font-medium text-[#e5e5e5] uppercase tracking-wide">
              Point Density
            </Label>
            <span className="text-[10px] text-[#a3a3a3] font-mono">{options.pointDensity.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="pointDensity"
              type="range"
              min="100000"
              max="10000000"
              step="100000"
              value={options.pointDensity}
              onChange={(e) => handleSliderChange("pointDensity", parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer"
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
              className="w-18 h-6 text-[10px] bg-[#262626] border-[#404040] text-[#e5e5e5] px-2 font-mono focus:border-[#505050] focus:ring-1 focus:ring-[#505050]"
            />
          </div>
        </div>

        {/* Field of View */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="fieldOfView" className="text-[10px] font-medium text-[#e5e5e5] uppercase tracking-wide">
              Field of View
            </Label>
            <span className="text-[10px] text-[#a3a3a3] font-mono">{options.fieldOfView}°</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="fieldOfView"
              type="range"
              min="30"
              max="120"
              step="1"
              value={options.fieldOfView}
              onChange={(e) => handleSliderChange("fieldOfView", parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer"
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
              className="w-16 h-6 text-[10px] bg-[#262626] border-[#404040] text-[#e5e5e5] px-2 font-mono focus:border-[#505050] focus:ring-1 focus:ring-[#505050]"
            />
          </div>
        </div>

        {/* Node Size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="nodeSize" className="text-[10px] font-medium text-[#e5e5e5] uppercase tracking-wide">
              Node Size
            </Label>
            <span className="text-[10px] text-[#a3a3a3] font-mono">{options.nodeSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="nodeSize"
              type="range"
              min="1"
              max="100"
              step="1"
              value={options.nodeSize}
              onChange={(e) => handleSliderChange("nodeSize", parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer"
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
              className="w-16 h-6 text-[10px] bg-[#262626] border-[#404040] text-[#e5e5e5] px-2 font-mono focus:border-[#505050] focus:ring-1 focus:ring-[#505050]"
            />
          </div>
        </div>

        {/* EDL Settings */}
        <div className="space-y-2.5 border-t border-[#404040] pt-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-medium text-[#e5e5e5] uppercase tracking-wide">EDL</Label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.edle}
                onChange={(e) => handleSwitchChange("edle", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-[#262626] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#404040] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#404040]"></div>
            </label>
          </div>

          {options.edle && (
            <>
              {/* EDL Radius */}
              <div className="space-y-1.5 pl-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="radius" className="text-[10px] font-medium text-[#a3a3a3] uppercase tracking-wide">
                    Radius
                  </Label>
                  <span className="text-[10px] text-[#a3a3a3] font-mono">{options.radius.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="radius"
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={options.radius}
                    onChange={(e) => handleSliderChange("radius", parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer"
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
                    className="w-16 h-6 text-[10px] bg-[#262626] border-[#404040] text-[#e5e5e5] px-2 font-mono focus:border-[#505050] focus:ring-1 focus:ring-[#505050]"
                  />
                </div>
              </div>

              {/* EDL Strength */}
              <div className="space-y-1.5 pl-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edlStrength" className="text-[10px] font-medium text-[#a3a3a3] uppercase tracking-wide">
                    Strength
                  </Label>
                  <span className="text-[10px] text-[#a3a3a3] font-mono">{options.edlStrength.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="edlStrength"
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={options.edlStrength}
                    onChange={(e) => handleSliderChange("edlStrength", parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer"
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
                    className="w-16 h-6 text-[10px] bg-[#262626] border-[#404040] text-[#e5e5e5] px-2 font-mono focus:border-[#505050] focus:ring-1 focus:ring-[#505050]"
                  />
                </div>
              </div>

              {/* EDL Opacity */}
              <div className="space-y-1.5 pl-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edleOpacity" className="text-[10px] font-medium text-[#a3a3a3] uppercase tracking-wide">
                    Opacity
                  </Label>
                  <span className="text-[10px] text-[#a3a3a3] font-mono">{options.edleOpacity.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="edleOpacity"
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.01"
                    value={options.edleOpacity}
                    onChange={(e) => handleSliderChange("edleOpacity", parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer"
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
                    className="w-16 h-6 text-[10px] bg-[#262626] border-[#404040] text-[#e5e5e5] px-2 font-mono focus:border-[#505050] focus:ring-1 focus:ring-[#505050]"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Background */}
        <div className="space-y-1.5 border-t border-[#404040] pt-2.5">
          <Label htmlFor="background" className="text-[10px] font-medium text-[#e5e5e5] uppercase tracking-wide">
            Background
          </Label>
          <select
            id="background"
            value={options.background}
            onChange={(e) => handleSelectChange("background", e.target.value)}
            className="w-full h-6 px-2 bg-[#262626] border border-[#404040] text-[#e5e5e5] text-[10px] rounded-sm focus:outline-none focus:border-[#505050] focus:ring-1 focus:ring-[#505050] transition-colors"
          >
            {backgroundOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Point Quality */}
        <div className="space-y-1.5 border-t border-[#404040] pt-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-medium text-[#e5e5e5] uppercase tracking-wide">High Quality</Label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.pointHQ}
                onChange={(e) => handleSwitchChange("pointHQ", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-[#262626] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#404040] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#404040]"></div>
            </label>
          </div>
        </div>

        {/* Point Size Type */}
        <div className="space-y-1.5 border-t border-[#404040] pt-2.5">
          <Label htmlFor="pointSizeType" className="text-[10px] font-medium text-[#e5e5e5] uppercase tracking-wide">
            Point Size Type
          </Label>
          <select
            id="pointSizeType"
            value={options.pointSizeType}
            onChange={(e) => handleSelectChange("pointSizeType", parseInt(e.target.value))}
            className="w-full h-6 px-2 bg-[#262626] border border-[#404040] text-[#e5e5e5] text-[10px] rounded-sm focus:outline-none focus:border-[#505050] focus:ring-1 focus:ring-[#505050] transition-colors"
          >
            {pointSizeTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PotreeViewerSettingsPanel;

