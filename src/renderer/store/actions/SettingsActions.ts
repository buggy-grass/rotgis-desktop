import ISettingsState from "../../models/ISettingsState";
import store from "../store";
import AppConfigService from "../../services/AppConfigService";

class SettingsActions {
  static getSettingsState(): ISettingsState {
    return store.getState().settingsReducer;
  }

  static setIsOpen(isSettingsOpen: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_IS_OPEN",
      payload: { isSettingsOpen },
    });
  }

  static setTheme(theme: "light" | "dark" | "system") {
    store.dispatch({
      type: "SETTINGS/SET_THEME",
      payload: { theme },
    });
    this.saveConfig();
  }

  static setLanguage(language: string) {
    store.dispatch({
      type: "SETTINGS/SET_LANGUAGE",
      payload: { language },
    });
    this.saveConfig();
  }

  static setAutoSave(autoSave: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_AUTO_SAVE",
      payload: { autoSave },
    });
    this.saveConfig();
  }

  static setAutoSaveInterval(autoSaveInterval: number) {
    store.dispatch({
      type: "SETTINGS/SET_AUTO_SAVE_INTERVAL",
      payload: { autoSaveInterval },
    });
    this.saveConfig();
  }

  static setDefaultProjectPath(defaultProjectPath: string) {
    store.dispatch({
      type: "SETTINGS/SET_DEFAULT_PROJECT_PATH",
      payload: { defaultProjectPath },
    });
    this.saveConfig();
  }

  static setGpuAcceleration(gpuAcceleration: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_GPU_ACCELERATION",
      payload: { gpuAcceleration },
    });
    this.saveConfig();
  }

  static setMaxMemoryUsage(maxMemoryUsage: number) {
    store.dispatch({
      type: "SETTINGS/SET_MAX_MEMORY_USAGE",
      payload: { maxMemoryUsage },
    });
    this.saveConfig();
  }

  static setRenderQuality(renderQuality: "low" | "medium" | "high" | "ultra") {
    store.dispatch({
      type: "SETTINGS/SET_RENDER_QUALITY",
      payload: { renderQuality },
    });
    this.saveConfig();
  }

  static resetToDefaults() {
    store.dispatch({
      type: "SETTINGS/RESET_TO_DEFAULTS",
      payload: {},
    });
  }

  static setMouseZoomSpeed(zoomSpeed: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_ZOOM_SPEED",
      payload: { zoomSpeed },
    });
    this.saveConfig();
  }

  static setMousePanSpeed(panSpeed: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_PAN_SPEED",
      payload: { panSpeed },
    });
    this.saveConfig();
  }

  static setMouseRotateSpeed(rotationSpeed: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_ROTATE_SPEED",
      payload: { rotationSpeed },
    });
    this.saveConfig();
  }

  static setMouseZoomButton(zoomButton?: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_ZOOM_BUTTON",
      payload: { zoomButton },
    });
    this.saveConfig();
  }

  static setMouseRotateButton(rotateButton?: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_ROTATE_BUTTON",
      payload: { rotateButton },
    });
    this.saveConfig();
  }

  static setMouseDragButton(dragButton?: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_DRAG_BUTTON",
      payload: { dragButton },
    });
    this.saveConfig();
  }

  static setMouseSensitivity(sensitivity: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_SENSITIVITY",
      payload: { sensitivity },
    });
  }

  static setMouseInvertZoom(invertZoom: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_INVERT_ZOOM",
      payload: { invertZoom },
    });
  }

  static setMouseInvertPan(invertPan: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_INVERT_PAN",
      payload: { invertPan },
    });
  }

  static setMouseDpi(dpi: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_DPI",
      payload: { dpi },
    });
  }

  static setMousePollingRate(pollingRate: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_POLLING_RATE",
      payload: { pollingRate },
    });
  }

  static setMouseAcceleration(acceleration: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_ACCELERATION",
      payload: { acceleration },
    });
    this.saveConfig();
  }

  static setMouseButtonBinding(buttonId: string, keyBinding: string, action: string) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_BUTTON_BINDING",
      payload: { buttonId, keyBinding, action },
    });
    this.saveConfig();
  }

  // Load settings from config file (without saving)
  static loadSettings(settings: Partial<ISettingsState>) {
    store.dispatch({
      type: "SETTINGS/LOAD_SETTINGS",
      payload: settings,
    });
  }

  // Save config file after any setting change
  // Use debounce to batch multiple rapid changes and ensure Redux state is updated
  private static saveConfigTimer: NodeJS.Timeout | null = null;
  private static readonly SAVE_CONFIG_DEBOUNCE_MS = 300; // 300ms debounce
  
  private static saveConfig() {
    // Clear existing timer
    if (this.saveConfigTimer) {
      clearTimeout(this.saveConfigTimer);
    }
    
    // Debounce: Wait for Redux state to update and batch rapid changes
    this.saveConfigTimer = setTimeout(() => {
      // Get the latest state from Redux store
      const state = store.getState().settingsReducer;
      
      // Debug: Log the values being saved
      console.log("Saving config - zoomButton:", state.zoomButton, "rotateButton:", state.rotateButton, "dragButton:", state.dragButton);
      
      AppConfigService.saveSettingsState(state).catch((error) => {
        console.error("Error saving config:", error);
      });
      this.saveConfigTimer = null;
    }, this.SAVE_CONFIG_DEBOUNCE_MS);
  }
}

export default SettingsActions;

