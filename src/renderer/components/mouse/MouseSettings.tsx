import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import SettingsActions from "../../store/actions/SettingsActions";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Mouse, ChevronDown, Zap } from "lucide-react";
import MouseIcon from '../../assets/app/settings/mouse.png';

interface MouseButton {
  id: string;
  name: string;
  position: { x: number; y: number; width: number; height: number };
  shape: "rect" | "circle" | "ellipse";
  color?: string;
}

const AVAILABLE_KEYS = [
  "Left Click",
  "Right Click",
  "Middle Click",
  "Button 4",
  "Button 5",
  "DPI Switch",
  "Wheel Up",
  "Wheel Down",
  "Scroll Left",
  "Scroll Right",
  "Double Click",
  "Drag",
  "Zoom In",
  "Zoom Out",
  "Pan",
  "Rotate",
  "Select",
  "Measure",
  "None",
];

const AVAILABLE_ACTIONS = [
  "Primary Click",
  "Secondary Click",
  "Scroll Click",
  "Back",
  "Forward",
  "Change DPI",
  "Scroll Up",
  "Scroll Down",
  "Pan Left",
  "Pan Right",
  "Zoom In",
  "Zoom Out",
  "Rotate",
  "Select",
  "Measure",
  "Custom",
  "None",
];

export default function MouseSettings() {
  const settings = useSelector((state: RootState) => state.settingsReducer);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [showKeyDropdown, setShowKeyDropdown] = useState<string | null>(null);
  const [showActionDropdown, setShowActionDropdown] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const keyDropdownRef = useRef<HTMLDivElement>(null);
  const actionDropdownRef = useRef<HTMLDivElement>(null);

  const mouseButtons: MouseButton[] = [
    {
      id: "left",
      name: "Left Click",
      position: { x: 85, y: 185, width: 55, height: 90 },
      shape: "rect",
      color: "#ffffff",
    },
    {
      id: "right",
      name: "Right Click",
      position: { x: 140, y: 185, width: 55, height: 90 },
      shape: "rect",
      color: "#ffffff",
    },
    {
      id: "middle",
      name: "Middle Click",
      position: { x: 100, y: 150, width: 80, height: 28 },
      shape: "rect",
      color: "#1a1a1a",
    },
    {
      id: "side1",
      name: "Side Button 1",
      position: { x: 25, y: 205, width: 32, height: 28 },
      shape: "ellipse",
      color: "#00d4ff",
    },
    {
      id: "side2",
      name: "Side Button 2",
      position: { x: 25, y: 240, width: 32, height: 28 },
      shape: "ellipse",
      color: "#00d4ff",
    },
    {
      id: "dpi",
      name: "DPI Button",
      position: { x: 120, y: 300, width: 42, height: 22 },
      shape: "rect",
      color: "#00d4ff",
    },
    {
      id: "wheel-up",
      name: "Wheel Up",
      position: { x: 105, y: 135, width: 70, height: 12 },
      shape: "rect",
      color: "#ffffff",
    },
    {
      id: "wheel-down",
      name: "Wheel Down",
      position: { x: 105, y: 188, width: 70, height: 12 },
      shape: "rect",
      color: "#ffffff",
    },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        keyDropdownRef.current &&
        !keyDropdownRef.current.contains(event.target as Node)
      ) {
        setShowKeyDropdown(null);
      }
      if (
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowActionDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getButtonBinding = (buttonId: string) => {
    if (!settings.mouseSettings.buttonBindings) {
      return null;
    }
    return settings.mouseSettings.buttonBindings.find(
      (b) => b.buttonId === buttonId
    ) || null;
  };

  const handleKeyChange = (buttonId: string, keyBinding: string) => {
    const binding = getButtonBinding(buttonId);
    const button = mouseButtons.find((b) => b.id === buttonId);
    SettingsActions.setMouseButtonBinding(
      buttonId,
      keyBinding,
      binding?.action || (button ? button.name : "None")
    );
    setShowKeyDropdown(null);
  };

  const handleActionChange = (buttonId: string, action: string) => {
    const binding = getButtonBinding(buttonId);
    SettingsActions.setMouseButtonBinding(
      buttonId,
      binding?.keyBinding || "None",
      action
    );
    setShowActionDropdown(null);
  };

  const renderMouseButton = (button: MouseButton) => {
    const binding = getButtonBinding(button.id);
    const isHovered = hoveredButton === button.id;
    const isSelected = selectedButton === button.id;

    let element;
    if (button.shape === "circle") {
      element = (
        <circle
          cx={button.position.x + button.position.width / 2}
          cy={button.position.y + button.position.height / 2}
          r={button.position.width / 2}
          fill={isHovered || isSelected ? button.color || "#00d4ff" : "#374151"}
          stroke={isSelected ? "#00d4ff" : isHovered ? "#00d4ff" : "#4b5563"}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
          opacity={isHovered || isSelected ? 1 : 0.8}
          className="cursor-pointer transition-all duration-200"
          onMouseEnter={() => setHoveredButton(button.id)}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={() => setSelectedButton(selectedButton === button.id ? null : button.id)}
          filter={isHovered || isSelected ? "url(#glow)" : undefined}
        />
      );
    } else if (button.shape === "ellipse") {
      element = (
        <ellipse
          cx={button.position.x + button.position.width / 2}
          cy={button.position.y + button.position.height / 2}
          rx={button.position.width / 2}
          ry={button.position.height / 2}
          fill={isHovered || isSelected ? button.color || "#00d4ff" : "#374151"}
          stroke={isSelected ? "#00d4ff" : isHovered ? "#00d4ff" : "#4b5563"}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
          opacity={isHovered || isSelected ? 1 : 0.8}
          className="cursor-pointer transition-all duration-200"
          onMouseEnter={() => setHoveredButton(button.id)}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={() => setSelectedButton(selectedButton === button.id ? null : button.id)}
          filter={isHovered || isSelected ? "url(#glow)" : undefined}
        />
      );
    } else {
      element = (
        <rect
          x={button.position.x}
          y={button.position.y}
          width={button.position.width}
          height={button.position.height}
          rx={button.id === "middle" ? 2 : 4}
          fill={isHovered || isSelected ? button.color || "#ffffff" : (button.color || "#374151")}
          stroke={isSelected ? "#00d4ff" : isHovered ? "#00d4ff" : "#4b5563"}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
          opacity={isHovered || isSelected ? 1 : (button.id === "left" || button.id === "right" || button.id === "wheel-up" || button.id === "wheel-down" ? 1 : 0.8)}
          className="cursor-pointer transition-all duration-200"
          onMouseEnter={() => setHoveredButton(button.id)}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={() => setSelectedButton(selectedButton === button.id ? null : button.id)}
          filter={isHovered || isSelected ? "url(#glow)" : undefined}
        />
      );
    }

    return (
      <g key={button.id}>
        {element}
        {(isHovered || isSelected) && button.id !== "left" && button.id !== "right" && (
          <text
            x={button.position.x + button.position.width / 2}
            y={button.position.y + button.position.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none text-xs font-semibold fill-current"
            fontSize="9"
            fontWeight="bold"
            fill="#00d4ff"
          >
            {button.name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Futuristic 3D Mouse Visualization */}
      <div className="bg-gradient-to-br from-card via-card to-muted/20 border border-border rounded-xl p-8 shadow-2xl">

        <div className="flex gap-8">
          {/* Mouse Image - Futuristic 3D Design */}
          <div className="flex-1 bg-gradient-to-br from-muted/50 via-background to-muted/30 rounded-lg p-8 border border-border/50 relative overflow-hidden flex items-center justify-center">
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            
            {/* Mouse Image */}
            <img
              src={MouseIcon}
              alt="Gaming Mouse"
              className="w-full h-auto max-w-md mx-auto relative z-10 object-contain"
              style={{ maxHeight: "700px", userSelect: "none" }}
            />

            {/* Hover hint */}
            {hoveredButton && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg text-center animate-pulse">
                <p className="text-sm font-medium text-primary">
                  Click to configure {hoveredButton}
                </p>
              </div>
            )}
          </div>

          {/* Configuration Panel */}
          {selectedButton && (
            <div className="w-80 space-y-4 transition-all duration-300">
              <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {mouseButtons.find((b) => b.id === selectedButton)?.name}
                </h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Key Binding</Label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowKeyDropdown(
                            showKeyDropdown === selectedButton ? null : selectedButton
                          )
                        }
                        className="w-full flex items-center justify-between px-3 py-2 bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                      >
                        <span>{getButtonBinding(selectedButton)?.keyBinding || "None"}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${showKeyDropdown === selectedButton ? "rotate-180" : ""
                            }`}
                        />
                      </button>
                      {showKeyDropdown === selectedButton && (
                        <div
                          ref={keyDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                        >
                          {AVAILABLE_KEYS.map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleKeyChange(selectedButton, key)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Action</Label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowActionDropdown(
                            showActionDropdown === selectedButton ? null : selectedButton
                          )
                        }
                        className="w-full flex items-center justify-between px-3 py-2 bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                      >
                        <span>{getButtonBinding(selectedButton)?.action || "None"}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${showActionDropdown === selectedButton ? "rotate-180" : ""
                            }`}
                        />
                      </button>
                      {showActionDropdown === selectedButton && (
                        <div
                          ref={actionDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                        >
                          {AVAILABLE_ACTIONS.map((action) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => handleActionChange(selectedButton, action)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedButton(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DPI and Polling Rate Settings */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <Label htmlFor="dpi" className="text-sm font-medium mb-2 block">
            DPI (Dots Per Inch)
          </Label>
          <div className="space-y-3">
            <Input
              id="dpi"
              type="number"
              min="100"
              max="32000"
              step="100"
              value={settings.mouseSettings.dpi}
              onChange={(e) =>
                SettingsActions.setMouseDpi(parseInt(e.target.value) || 1600)
              }
              className="text-lg font-semibold"
            />
            <div className="flex gap-2">
              {[800, 1600, 3200, 6400].map((dpi) => (
                <Button
                  key={dpi}
                  variant={settings.mouseSettings.dpi === dpi ? "default" : "outline"}
                  size="sm"
                  onClick={() => SettingsActions.setMouseDpi(dpi)}
                >
                  {dpi}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <Label htmlFor="pollingRate" className="text-sm font-medium mb-2 block">
            Polling Rate (Hz)
          </Label>
          <div className="space-y-3">
            <Input
              id="pollingRate"
              type="number"
              min="125"
              max="8000"
              step="125"
              value={settings.mouseSettings.pollingRate}
              onChange={(e) =>
                SettingsActions.setMousePollingRate(parseInt(e.target.value) || 1000)
              }
              className="text-lg font-semibold"
            />
            <div className="flex gap-2 flex-wrap">
              {[125, 250, 500, 1000, 2000, 4000, 8000].map((rate) => (
                <Button
                  key={rate}
                  variant={settings.mouseSettings.pollingRate === rate ? "default" : "outline"}
                  size="sm"
                  onClick={() => SettingsActions.setMousePollingRate(rate)}
                >
                  {rate}Hz
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Acceleration Toggle */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="mouseAcceleration" className="text-sm font-medium">
              Mouse Acceleration
            </Label>
            <p className="text-xs text-muted-foreground">
              Enable pointer acceleration for faster cursor movement
            </p>
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={settings.mouseSettings.acceleration}
            onClick={() =>
              SettingsActions.setMouseAcceleration(!settings.mouseSettings.acceleration)
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${settings.mouseSettings.acceleration ? "bg-primary" : "bg-muted"
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.mouseSettings.acceleration ? "translate-x-6" : "translate-x-1"
                }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
