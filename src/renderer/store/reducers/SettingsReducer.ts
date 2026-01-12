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
  mouseSettings: {
    zoomSpeed: 40,
    panSpeed: 1.0,
    rotationSpeed: 30,
    sensitivity: 1.0,
    invertZoom: false,
    invertPan: false,
    zoomButton: 2, // Mouse Right (0b0010)
    rotateButton: undefined, // Not set by default
    dragButton: 8, // Button 4 (0b1000)
    dpi: 1600,
    pollingRate: 1000, // Hz
    acceleration: false,
    buttonBindings: [
      { buttonId: "left", buttonName: "Left Click", keyBinding: "Left Click", action: "Primary Click" },
      { buttonId: "right", buttonName: "Right Click", keyBinding: "Right Click", action: "Secondary Click" },
      { buttonId: "middle", buttonName: "Middle Click", keyBinding: "Middle Click", action: "Scroll Click" },
      { buttonId: "side1", buttonName: "Side Button 1", keyBinding: "Button 4", action: "Back" },
      { buttonId: "side2", buttonName: "Side Button 2", keyBinding: "Button 5", action: "Forward" },
      { buttonId: "dpi", buttonName: "DPI Button", keyBinding: "DPI Switch", action: "Change DPI" },
      { buttonId: "wheel-up", buttonName: "Wheel Up", keyBinding: "Scroll Up", action: "Scroll Up" },
      { buttonId: "wheel-down", buttonName: "Wheel Down", keyBinding: "Scroll Down", action: "Scroll Down" },
    ],
  },
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
        mouseSettings: {
          ...state.mouseSettings,
          zoomSpeed: action.payload.zoomSpeed,
        },
      };
    case "SETTINGS/SET_MOUSE_PAN_SPEED":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          panSpeed: action.payload.panSpeed,
        },
      };
    case "SETTINGS/SET_MOUSE_ROTATE_SPEED":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          rotationSpeed: action.payload.rotationSpeed,
        },
      };
    case "SETTINGS/SET_MOUSE_ZOOM_BUTTON":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          zoomButton: action.payload.zoomButton,
        },
      };
    case "SETTINGS/SET_MOUSE_ROTATE_BUTTON":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          rotateButton: action.payload.rotateButton,
        },
      };
    case "SETTINGS/SET_MOUSE_DRAG_BUTTON":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          dragButton: action.payload.dragButton,
        },
      };
    case "SETTINGS/SET_MOUSE_SENSITIVITY":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          sensitivity: action.payload.sensitivity,
        },
      };
    case "SETTINGS/SET_MOUSE_INVERT_ZOOM":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          invertZoom: action.payload.invertZoom,
        },
      };
    case "SETTINGS/SET_MOUSE_INVERT_PAN":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          invertPan: action.payload.invertPan,
        },
      };
    case "SETTINGS/SET_MOUSE_DPI":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          dpi: action.payload.dpi,
        },
      };
    case "SETTINGS/SET_MOUSE_POLLING_RATE":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          pollingRate: action.payload.pollingRate,
        },
      };
    case "SETTINGS/SET_MOUSE_ACCELERATION":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          acceleration: action.payload.acceleration,
        },
      };
    case "SETTINGS/SET_MOUSE_BUTTON_BINDING":
      return {
        ...state,
        mouseSettings: {
          ...state.mouseSettings,
          buttonBindings: state.mouseSettings.buttonBindings.map((binding) =>
            binding.buttonId === action.payload.buttonId
              ? {
                  ...binding,
                  keyBinding: action.payload.keyBinding,
                  action: action.payload.action,
                }
              : binding
          ),
        },
      };
    case "SETTINGS/LOAD_SETTINGS":
      return {
        ...state,
        ...action.payload,
        mouseSettings: action.payload.mouseSettings
          ? {
              ...state.mouseSettings,
              ...action.payload.mouseSettings,
            }
          : state.mouseSettings,
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

