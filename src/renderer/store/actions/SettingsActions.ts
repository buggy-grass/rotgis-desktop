import ISettingsState from "../../models/ISettingsState";
import store from "../store";

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
  }

  static setLanguage(language: string) {
    store.dispatch({
      type: "SETTINGS/SET_LANGUAGE",
      payload: { language },
    });
  }

  static setAutoSave(autoSave: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_AUTO_SAVE",
      payload: { autoSave },
    });
  }

  static setAutoSaveInterval(autoSaveInterval: number) {
    store.dispatch({
      type: "SETTINGS/SET_AUTO_SAVE_INTERVAL",
      payload: { autoSaveInterval },
    });
  }

  static setDefaultProjectPath(defaultProjectPath: string) {
    store.dispatch({
      type: "SETTINGS/SET_DEFAULT_PROJECT_PATH",
      payload: { defaultProjectPath },
    });
  }

  static setGpuAcceleration(gpuAcceleration: boolean) {
    store.dispatch({
      type: "SETTINGS/SET_GPU_ACCELERATION",
      payload: { gpuAcceleration },
    });
  }

  static setMaxMemoryUsage(maxMemoryUsage: number) {
    store.dispatch({
      type: "SETTINGS/SET_MAX_MEMORY_USAGE",
      payload: { maxMemoryUsage },
    });
  }

  static setRenderQuality(renderQuality: "low" | "medium" | "high" | "ultra") {
    store.dispatch({
      type: "SETTINGS/SET_RENDER_QUALITY",
      payload: { renderQuality },
    });
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
  }

  static setMousePanSpeed(panSpeed: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_PAN_SPEED",
      payload: { panSpeed },
    });
  }

  static setMouseRotateSpeed(rotateSpeed: number) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_ROTATE_SPEED",
      payload: { rotateSpeed },
    });
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
  }

  static setMouseButtonBinding(buttonId: string, keyBinding: string, action: string) {
    store.dispatch({
      type: "SETTINGS/SET_MOUSE_BUTTON_BINDING",
      payload: { buttonId, keyBinding, action },
    });
  }
}

export default SettingsActions;

