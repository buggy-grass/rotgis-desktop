export default interface ISettingsState {
  isSettingsOpen: boolean;
  theme: "light" | "dark" | "system";
  language: string;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  defaultProjectPath: string;
  gpuAcceleration: boolean;
  maxMemoryUsage: number; // MB
  renderQuality: "low" | "medium" | "high" | "ultra";
  mouseSettings: {
    // Potree viewer mouse controls
    zoomSpeed: number; // Zoom speed (1 - 50)
    panSpeed: number; // Pan/drag speed (0.1 - 5.0)
    rotationSpeed: number; // Rotation speed (1 - 50)
    sensitivity: number; // General mouse sensitivity (0.1 - 5.0)
    invertZoom: boolean; // Invert mouse wheel zoom direction
    invertPan: boolean; // Invert pan direction
    // Mouse button mappings for Potree
    zoomButton?: number; // Button code for zoom (1=left, 2=right, 4=middle, 8=button4, 16=button5)
    rotateButton?: number; // Button code for rotation
    dragButton?: number; // Button code for drag
    // Mouse hardware settings
    dpi: number; // Dots per inch (100 - 32000)
    pollingRate: number; // Polling rate in Hz (125 - 8000)
    acceleration: boolean; // Mouse acceleration enabled
    buttonBindings: {
      buttonId: string;
      buttonName: string;
      keyBinding: string;
      action: string;
    }[];
  };
}

