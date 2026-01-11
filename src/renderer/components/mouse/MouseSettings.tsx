import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import SettingsActions from "../../store/actions/SettingsActions";
import { Label } from "../ui/label";
import { ChevronDown } from "lucide-react";
import MouseIcon from '../../assets/app/settings/mouse.png';
import { makeUseStyles } from "../../styles/makeUseStyles";

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
  mouseTargetPosition: { x: number; y: number }; // Mouse görseli üzerindeki hedef pozisyon (%)
}

const MOUSE_BUTTONS: MouseButtonConfig[] = [
  {
    id: "left",
    name: "Button Left",
    mouseTargetPosition: { x: 30, y: 50 }, // Sol tuş pozisyonu
  },
  {
    id: "right",
    name: "Button Right",
    mouseTargetPosition: { x: 70, y: 50 }, // Sağ tuş pozisyonu
  },
  {
    id: "wheel",
    name: "MOUSE_WHEEL",
    mouseTargetPosition: { x: 50, y: 35 }, // Scroll wheel pozisyonu
  },
  {
    id: "button4",
    name: "BUTTON 4",
    mouseTargetPosition: { x: 15, y: 55 }, // Sol yan buton pozisyonu
  },
  {
    id: "button5",
    name: "BUTTON 5",
    mouseTargetPosition: { x: 15, y: 65 }, // Sol yan buton 2 pozisyonu
  },
];

export default function MouseSettings() {
  const settings = useSelector((state: RootState) => state.settingsReducer);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const mouseImageRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const buttonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedButton, setSelectedButton] = useState<string>("");

  const dropdownOptions = ["Yaw/Pitch/Roll", "Mouse Doll", "Rotate"];

  // Initialize button values from store
  const getButtonValue = (buttonId: string): string => {
    const mapping: Record<string, string> = {
      left: "left",
      right: "right",
      wheel: "middle",
      button4: "side1",
      button5: "side2",
    };
    const storeId = mapping[buttonId];
    const binding = settings.mouseSettings.buttonBindings.find((b) => b.buttonId === storeId);
    // Map store actions to dropdown options
    if (binding?.action === "Yaw/Pitch/Roll" || binding?.action === "Mouse Doll" || binding?.action === "Rotate") {
      return binding.action;
    }
    // Default values
    const defaults: Record<string, string> = {
      left: "Yaw/Pitch/Roll",
      right: "Rotate",
      wheel: "Mouse Doll",
      button4: "Rotate",
      button5: "Yaw/Pitch/Roll",
    };
    return defaults[buttonId] || "Yaw/Pitch/Roll";
  };

  const handleDropdownChange = (buttonId: string, value: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [buttonId]: false }));
    setSelectedButton("");
    // Store'a kaydet
    const mapping: Record<string, string> = {
      left: "left",
      right: "right",
      wheel: "middle",
      button4: "side1",
      button5: "side2",
    };
    const storeId = mapping[buttonId];
    const binding = settings.mouseSettings.buttonBindings.find((b) => b.buttonId === storeId);
    if (binding) {
      SettingsActions.setMouseButtonBinding(storeId, binding.keyBinding, value);
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

  useEffect(()=>{
    if(selectedButton){
      toggleDropdown(selectedButton);
    }
  },[selectedButton])

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
                  className={`mouse-button ${selectedButton === "left" ? "is-selected" : ""
                    }`}
                  style={{ transform: "translate(213px, 185px)" }}
                  onClick={() => setSelectedButton("left")}
                />

                <path
                  className={`mouse-button ${selectedButton === "right" ? "is-selected" : ""
                    }`}
                  d="M0.5 219.978V233.978V254.978L10 260.978L25 258.978L49 243.978L72.5 226.478L108 194.978L155.5 151.978L194.5 118.978L229.5 94.4779L268 68.9779L299 50.9779L329.5 32.9779L360.5 10.4779L375 0.477875L355.5 6.47787L320.5 18.9779L289.5 29.9779L250.5 46.4779L204.5 68.9779L136.5 107.478L78 143.478L42 168.478L17 193.478L5.5 206.978L0.5 219.978Z"
                  fill="rgba(255,0,0,0.6)"
                  style={{ transform: "translate(117px, 99px)" }}
                  onClick={() => setSelectedButton("right")}
                />

                <path
                  className={`mouse-button ${selectedButton === "button4" ? "is-selected" : ""
                    }`}
                  d="M19.5911 47.5L0.591125 71L5.09113 80L13.5911 88H21.5911L31.0911 80L47.5911 69L64.0911 57L79.0911 47.5L95.0911 38L97.5911 26.5L95.0911 17.5L91.5911 8L85.5911 0.5H79.0911L56.5911 14L37.5911 29.5L19.5911 47.5Z"
                  fill="rgba(255,0,0,0.6)"
                  style={{ transform: "translate(538px, 240px)" }}
                  onClick={() => setSelectedButton("button4")}
                />

                <path
                  className={`mouse-button ${selectedButton === "button5" ? "is-selected" : ""
                    }`}
                  d="M8.87897 6L0.878967 9L8.87897 17.5L13.379 26.5L15.879 33.5V40.5L13.379 46L20.379 43L35.379 38.5L50.879 33.5L64.379 29.5L79.379 26.5H88.379L93.379 21.5L97.379 15L93.379 6L85.379 0.5H70.379H56.879H40.879L24.379 3L8.87897 6Z"
                  fill="rgba(255,0,0,0.6)"
                  style={{ transform: "translate(623px, 233px)" }}
                  onClick={() => setSelectedButton("button5")}
                />

                <path
                  className={`mouse-button ${selectedButton === "wheel" ? "is-selected" : ""
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
