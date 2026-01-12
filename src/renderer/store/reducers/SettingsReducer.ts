import ISettingsState from "../../models/ISettingsState";
import IActionsProps from "../../models/IActionsProps";
import { Reducer } from "redux";

const initialState: ISettingsState = {
  isSettingsOpen: false,
  theme: "dark",
  language: "en",
  autoSave: true,
  autoSaveInterval: 300, // 5 minutes
  defaultProjectPath: "",
  gpuAcceleration: true,
  maxMemoryUsage: 8192, // 8GB
  renderQuality: "high",
  zoomSpeed: 20,
  rotationSpeed: 20,
  rotateButton: 2,
  zoomButton: 8,
  dragButton: 1,
  acceleration: false
};

const SettingsReducer: Reducer<ISettingsState, IActionsProps> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case "SETTINGS/SET_IS_OPEN":
      return {
        ...state,
        isSettingsOpen: action.payload.isSettingsOpen,
      };
    case "SETTINGS/SET_THEME":
      return {
        ...state,
        theme: action.payload.theme,
      };
    case "SETTINGS/SET_LANGUAGE":
      return {
        ...state,
        language: action.payload.language,
      };
    case "SETTINGS/SET_AUTO_SAVE":
      return {
        ...state,
        autoSave: action.payload.autoSave,
      };
    case "SETTINGS/SET_AUTO_SAVE_INTERVAL":
      return {
        ...state,
        autoSaveInterval: action.payload.autoSaveInterval,
      };
    case "SETTINGS/SET_DEFAULT_PROJECT_PATH":
      return {
        ...state,
        defaultProjectPath: action.payload.defaultProjectPath,
      };
    case "SETTINGS/SET_GPU_ACCELERATION":
      return {
        ...state,
        gpuAcceleration: action.payload.gpuAcceleration,
      };
    case "SETTINGS/SET_MAX_MEMORY_USAGE":
      return {
        ...state,
        maxMemoryUsage: action.payload.maxMemoryUsage,
      };
    case "SETTINGS/SET_RENDER_QUALITY":
      return {
        ...state,
        renderQuality: action.payload.renderQuality,
      };
    case "SETTINGS/SET_MOUSE_ZOOM_SPEED":
      return {
        ...state,
        zoomSpeed: action.payload.zoomSpeed,
      };
    case "SETTINGS/SET_MOUSE_ROTATE_SPEED":
      return {
        ...state,
        rotationSpeed: action.payload.rotationSpeed,
      };
    case "SETTINGS/SET_MOUSE_ZOOM_BUTTON":
      return {
        ...state,
        zoomButton: action.payload.zoomButton,
      };
    case "SETTINGS/SET_MOUSE_ROTATE_BUTTON":
      return {
        ...state,
        rotateButton: action.payload.rotateButton,
      };
    case "SETTINGS/SET_MOUSE_DRAG_BUTTON":
      return {
        ...state,
        dragButton: action.payload.dragButton,
      };
    case "SETTINGS/SET_MOUSE_ACCELERATION":
      return {
        ...state,
        acceleration: action.payload.acceleration,
      };
    case "SETTINGS/LOAD_SETTINGS":
      return {
        ...state,
        ...action.payload,
        isSettingsOpen: state.isSettingsOpen, // Keep open state
      };
    case "SETTINGS/RESET_TO_DEFAULTS":
      return {
        ...initialState,
        isSettingsOpen: state.isSettingsOpen, // Keep open state
      };
    default:
      return state;
  }
};

export default SettingsReducer;

