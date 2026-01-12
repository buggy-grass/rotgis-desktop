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
  zoomSpeed: number,
  rotationSpeed: number,
  rotateButton: number,
  zoomButton: number,
  dragButton: number,
  acceleration: boolean
}

