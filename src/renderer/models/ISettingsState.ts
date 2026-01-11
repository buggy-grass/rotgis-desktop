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
    zoomSpeed: number; // Mouse wheel zoom speed (0.1 - 5.0)
    panSpeed: number; // Pan/drag speed (0.1 - 5.0)
    rotateSpeed: number; // Yaw/Pitch rotation speed (0.1 - 5.0)
    sensitivity: number; // General mouse sensitivity (0.1 - 5.0)
    invertZoom: boolean; // Invert mouse wheel zoom direction
    invertPan: boolean; // Invert pan direction
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

