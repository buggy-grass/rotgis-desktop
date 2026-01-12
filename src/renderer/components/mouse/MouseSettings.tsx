import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import SettingsActions from "../../store/actions/SettingsActions";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { ChevronDown } from "lucide-react";
import MouseIcon from '../../assets/app/settings/mouse.png';
import PotreeService from "../../services/PotreeService";

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
  "Yaw/Pitch/Roll",
  "Mouse Doll",
];

interface MouseButtonConfig {
  id: string;
  name: string;
  value: number; // Potree button code (1=left, 2=right, 4=middle, 8=button4, 16=button5)
}

const MOUSE_BUTTONS: MouseButtonConfig[] = [
  {
    id: "left",
    name: "Button Left",
    value: 1
  },
  {
    id: "right",
    name: "Button Right",
    value: 2
  },
  {
    id: "wheel",
    name: "MOUSE_WHEEL",
    value: 4
  },
  {
    id: "button4",
    name: "BUTTON 4",
    value: 8
  },
  {
    id: "button5",
    name: "BUTTON 5",
    value: 16
  },
];

type ActionType = "Zoom" | "Rotation" | "Drag" | "None";

export default function MouseSettings() {
  const settings = useSelector((state: RootState) => state.settingsReducer);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const mouseImageRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const buttonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedButton, setSelectedButton] = useState<string>("");
  const [onMouseDropdown, setOnMouseDropdown] = useState<string>("");

  const dropdownOptions: ActionType[] = ["Zoom", "Rotation", "Drag", "None"];

  // Get button action from Redux state
  const getButtonValue = (buttonId: string): ActionType => {
    const buttonValue = MOUSE_BUTTONS.find((b) => b.id === buttonId)?.value;
    if (!buttonValue) return "None";

    if (settings.mouseSettings.zoomButton === buttonValue) return "Zoom";
    if (settings.mouseSettings.rotateButton === buttonValue) return "Rotation";
    if (settings.mouseSettings.dragButton === buttonValue) return "Drag";
    return "None";
  };

  // Convert Redux state to button actions mapping
  const getButtonActions = (): Record<string, ActionType> => {
    const actions: Record<string, ActionType> = {
      left: "None",
      right: "None",
      wheel: "None",
      button4: "None",
      button5: "None",
    };

    MOUSE_BUTTONS.forEach((button) => {
      if (settings.mouseSettings.zoomButton === button.value) {
        actions[button.id] = "Zoom";
      } else if (settings.mouseSettings.rotateButton === button.value) {
        actions[button.id] = "Rotation";
      } else if (settings.mouseSettings.dragButton === button.value) {
        actions[button.id] = "Drag";
      }
    });

    return actions;
  };

  // Update PotreeService when settings change
  useEffect(() => {
    PotreeService.setMouseConfigurations(
      settings.mouseSettings.zoomButton,
      settings.mouseSettings.rotateButton,
      settings.mouseSettings.dragButton,
      settings.mouseSettings.zoomSpeed,
      settings.mouseSettings.rotationSpeed
    );
  }, [
    settings.mouseSettings.zoomButton,
    settings.mouseSettings.rotateButton,
    settings.mouseSettings.dragButton,
    settings.mouseSettings.zoomSpeed,
    settings.mouseSettings.rotationSpeed,
  ]);

  const handleDropdownChange = (buttonId: string, value: ActionType) => {
    setOpenDropdowns((prev) => ({ ...prev, [buttonId]: false }));
    setSelectedButton("");

    const button = MOUSE_BUTTONS.find((b) => b.id === buttonId);
    if (!button) return;

    // Eğer None seçildiyse, bu butonun action'ını kaldır
    if (value === "None") {
      // Mevcut action'ları kontrol et ve bu butonu kaldır
      if (settings.mouseSettings.zoomButton === button.value) {
        SettingsActions.setMouseZoomButton(undefined);
      }
      if (settings.mouseSettings.rotateButton === button.value) {
        SettingsActions.setMouseRotateButton(undefined);
      }
      if (settings.mouseSettings.dragButton === button.value) {
        SettingsActions.setMouseDragButton(undefined);
      }
      return;
    }

    // Aynı action'ı başka bir butonda kullanan varsa, onu undefined yap
    const currentActions = getButtonActions();
    Object.keys(currentActions).forEach((key) => {
      if (key !== buttonId && currentActions[key] === value) {
        const otherButton = MOUSE_BUTTONS.find((b) => b.id === key);
        if (!otherButton) return;

        if (value === "Zoom" && settings.mouseSettings.zoomButton === otherButton.value) {
          SettingsActions.setMouseZoomButton(undefined);
        } else if (value === "Rotation" && settings.mouseSettings.rotateButton === otherButton.value) {
          SettingsActions.setMouseRotateButton(undefined);
        } else if (value === "Drag" && settings.mouseSettings.dragButton === otherButton.value) {
          SettingsActions.setMouseDragButton(undefined);
        }
      }
    });

    // Yeni action'ı bu butona ata (useEffect otomatik olarak PotreeService'i güncelleyecek)
    if (value === "Zoom") {
      SettingsActions.setMouseZoomButton(button.value);
    } else if (value === "Rotation") {
      SettingsActions.setMouseRotateButton(button.value);
    } else if (value === "Drag") {
      SettingsActions.setMouseDragButton(button.value);
    }
  };

  const toggleDropdown = (buttonId: string) => {
    setOpenDropdowns((prev) => {
      const isCurrentlyOpen = prev[buttonId];
      // Eğer bu dropdown zaten açıksa kapat, değilse tümünü kapat ve sadece bunu aç
      if (isCurrentlyOpen) {
        setSelectedButton("");
        return { ...prev, [buttonId]: false };
      } else {
        setSelectedButton(buttonId);
        return { [buttonId]: true };
      }
    });
  };

  useEffect(() => {
    if (selectedButton) {
      setOpenDropdowns({});
      toggleDropdown(selectedButton);
    }
  }, [selectedButton])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutside = Object.values(dropdownRefs.current).every(
        (ref) => ref && !ref.contains(target)
      );
      const clickedButton = Object.values(buttonRefs.current).some(
        (ref) => ref && ref.contains(target)
      );

      if (clickedOutside && !clickedButton) {
        setOpenDropdowns({});
        setSelectedButton("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Futuristic 3D Mouse Visualization */}
      <div className="bg-gradient-to-br from-card via-card to-muted/20 border border-border rounded-xl p-8 shadow-2xl" style={{ position: "relative", minHeight: "600px" }}>

        <div className="flex gap-8 relative">
          {/* Butonlar ve Dropdown'lar - Sol Taraf */}
          <div className="flex flex-col gap-4 min-w-[280px]">
            {MOUSE_BUTTONS.map((button) => (
              <div key={button.id} className="flex items-center gap-3">
                {/* Button Label */}
                <div
                  ref={(el) => (buttonRefs.current[button.id] = el)}
                  className={`border px-3 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors w-32 text-center ${openDropdowns[button.id]
                    ? "bg-red-500/20 border-red-500/50 text-red-500"
                    : "bg-card border-border"
                    }`}
                >
                  {button.name}
                </div>

                {/* Dropdown */}
                <div
                  ref={(el) => (dropdownRefs.current[button.id] = el)}
                  className="relative flex-1"
                >
                  <button
                    onClick={() => toggleDropdown(button.id)}
                    onMouseEnter={() => setOnMouseDropdown(button.id)}
                    onMouseLeave={() => setOnMouseDropdown("")}
                    className="w-full flex items-center justify-between px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                  >
                    <span>{getButtonValue(button.id)}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${openDropdowns[button.id] ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openDropdowns[button.id] && (
                    <div className="absolute top-0 left-full ml-2 w-48 bg-card border border-border rounded-lg shadow-lg z-40 overflow-hidden">
                      {dropdownOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleDropdownChange(button.id, option)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${getButtonValue(button.id) === option ? "bg-accent font-medium" : ""
                            }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mouse Image - Futuristic 3D Design */}
          <div
            ref={mouseImageRef}
            className="flex-1 bg-gradient-to-br from-muted/50 via-background to-muted/30 rounded-lg p-8 border border-border/50 relative overflow-visible flex items-center justify-center"
            style={{ position: "relative", minHeight: "500px" }}
          >
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none rounded-lg" />

            {/* Mouse Image */}
            <div
              className="relative w-full max-w-md mx-auto"
              style={{ maxHeight: "500px" }}
            >
              <img
                src={MouseIcon}
                alt="Gaming Mouse"
                className="w-full h-auto object-contain block"
                style={{ userSelect: "none" }}
              />

              <svg
                viewBox="0 0 1000 600"
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 w-full h-full"

              >
                <path
                  d="M38.6644 166.531L8.16441 207.031L0.664413 225.031L38.6644 238.531L101.664 249.531L178.664 238.531L226.664 214.031L268.164 178.531L309.664 124.531L335.664 74.5309L344.164 41.0309L302.664 14.0309L268.164 0.530853L226.664 14.0309L171.164 56.0309L101.664 111.031L38.6644 166.531Z"
                  className={`mouse-button ${selectedButton === "left" ? "is-selected" : onMouseDropdown == "left" ? "is-active" : ""
                    }`}
                  style={{ transform: "translate(213px, 185px)" }}
                  onClick={() => setSelectedButton("left")}
                />

                <path
                  className={`mouse-button ${selectedButton === "right" ? "is-selected" : onMouseDropdown == "right" ? "is-active" : ""
                    }`}
                  d="M0.5 219.978V233.978V254.978L10 260.978L25 258.978L49 243.978L72.5 226.478L108 194.978L155.5 151.978L194.5 118.978L229.5 94.4779L268 68.9779L299 50.9779L329.5 32.9779L360.5 10.4779L375 0.477875L355.5 6.47787L320.5 18.9779L289.5 29.9779L250.5 46.4779L204.5 68.9779L136.5 107.478L78 143.478L42 168.478L17 193.478L5.5 206.978L0.5 219.978Z"
                  fill="rgba(255,0,0,0.6)"
                  style={{ transform: "translate(117px, 99px)" }}
                  onClick={() => setSelectedButton("right")}
                />

                <path
                  className={`mouse-button ${selectedButton === "button4" ? "is-selected" : onMouseDropdown == "button4" ? "is-active" : ""
                    }`}
                  d="M19.5911 47.5L0.591125 71L5.09113 80L13.5911 88H21.5911L31.0911 80L47.5911 69L64.0911 57L79.0911 47.5L95.0911 38L97.5911 26.5L95.0911 17.5L91.5911 8L85.5911 0.5H79.0911L56.5911 14L37.5911 29.5L19.5911 47.5Z"
                  fill="rgba(255,0,0,0.6)"
                  style={{ transform: "translate(538px, 240px)" }}
                  onClick={() => setSelectedButton("button4")}
                />

                <path
                  className={`mouse-button ${selectedButton === "button5" ? "is-selected" : onMouseDropdown == "button5" ? "is-active" : ""
                    }`}
                  d="M8.87897 6L0.878967 9L8.87897 17.5L13.379 26.5L15.879 33.5V40.5L13.379 46L20.379 43L35.379 38.5L50.879 33.5L64.379 29.5L79.379 26.5H88.379L93.379 21.5L97.379 15L93.379 6L85.379 0.5H70.379H56.879H40.879L24.379 3L8.87897 6Z"
                  fill="rgba(255,0,0,0.6)"
                  style={{ transform: "translate(623px, 233px)" }}
                  onClick={() => setSelectedButton("button5")}
                />

                <path
                  className={`mouse-button ${selectedButton === "wheel" ? "is-selected" : onMouseDropdown == "wheel" ? "is-active" : ""
                    }`}
                  d="M4 112.5L13 117L20 110.5L34.5 98.5L52.5 83.5L76.5 62L100 42.5L123 21.5L131.5 14L126.5 10L114 4L104 0.5H95L78.5 7.5L57 17.5L38 30L20 45.5L11 59.5L7.5 71L0.5 95.5V104L4 112.5Z"
                  fill="rgba(255,0,0,0.6)"
                  style={{ transform: "translate(270px, 197px)" }}
                  onClick={() => setSelectedButton("wheel")}
                />
              </svg>
            </div>

            {/* <path
          d="M520 100 L820 120 L800 320 L500 300 Z"
          fill={state.right ? "rgba(255,0,0,0.4)" : "transparent"}
        /> */}
            {/* <rect
          x="450"
          y="150"
          width="100"
          height="180"
          rx="20"
          fill={state.scroll ? "rgba(0,0,255,0.4)" : "transparent"}
        /> */}

          </div>

        </div>
      </div>

      {/* Zoom Speed Control */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zoomSpeed" className="text-sm font-medium">
              Zoom Speed
            </Label>
            <p className="text-xs text-muted-foreground">
              Adjust zoom speed (1-50)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Input
              id="zoomSpeed"
              type="number"
              min="1"
              max="50"
              value={settings.mouseSettings.zoomSpeed}
              onChange={(e) => {
                const value = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                SettingsActions.setMouseZoomSpeed(value);
                PotreeService.setMouseConfigurations(
                  settings.mouseSettings.zoomButton,
                  settings.mouseSettings.rotateButton,
                  settings.mouseSettings.dragButton,
                  value,
                  settings.mouseSettings.rotationSpeed
                );
              }}
              className="w-24"
            />
            <input
              type="range"
              min="1"
              max="50"
              value={settings.mouseSettings.zoomSpeed}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                SettingsActions.setMouseZoomSpeed(value);
                PotreeService.setMouseConfigurations(
                  settings.mouseSettings.zoomButton,
                  settings.mouseSettings.rotateButton,
                  settings.mouseSettings.dragButton,
                  value,
                  settings.mouseSettings.rotationSpeed
                );
              }}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground min-w-[2rem] text-right">
              {settings.mouseSettings.zoomSpeed}
            </span>
          </div>
        </div>
      </div>

      {/* Rotation Speed Control */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rotationSpeed" className="text-sm font-medium">
              Rotation Speed
            </Label>
            <p className="text-xs text-muted-foreground">
              Adjust rotation speed (1-50)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Input
              id="rotationSpeed"
              type="number"
              min="1"
              max="50"
              value={settings.mouseSettings.rotationSpeed}
              onChange={(e) => {
                const value = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                SettingsActions.setMouseRotateSpeed(value);
                PotreeService.setMouseConfigurations(
                  settings.mouseSettings.zoomButton,
                  settings.mouseSettings.rotateButton,
                  settings.mouseSettings.dragButton,
                  settings.mouseSettings.zoomSpeed,
                  value
                );
              }}
              className="w-24"
            />
            <input
              type="range"
              min="1"
              max="50"
              value={settings.mouseSettings.rotationSpeed}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                SettingsActions.setMouseRotateSpeed(value);
                PotreeService.setMouseConfigurations(
                  settings.mouseSettings.zoomButton,
                  settings.mouseSettings.rotateButton,
                  settings.mouseSettings.dragButton,
                  settings.mouseSettings.zoomSpeed,
                  value
                );
              }}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground min-w-[2rem] text-right">
              {settings.mouseSettings.rotationSpeed}
            </span>
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
    </div >
  );
}
