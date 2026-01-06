import IAppState from "../../models/IAppState";
import IActionsProps from "../../models/IActionsProps";
import { Reducer } from "redux";

const initialState: IAppState = {
  appName: "RotGIS Desktop",
  projectName: "Untitled Project",
  isLoading: false,
  loadingProgress: {
    percentage: 0,
    message: "",
  },
};

const AppReducer: Reducer<IAppState, IActionsProps> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case "APP_REDUCER/SET_APP_NAME":
      return {
        ...state,
        appName: action.payload.appName,
      };
    case "APP_REDUCER/SET_PROJECT_NAME":
      return {
        ...state,
        projectName: action.payload.projectName,
      };
    case "APP_REDUCER/SET_LOADING":
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };
    case "APP_REDUCER/SET_LOADING_PROGRESS":
      return {
        ...state,
        loadingProgress: {
          percentage: action.payload.percentage ?? state.loadingProgress.percentage,
          message: action.payload.message ?? state.loadingProgress.message,
        },
      };
    case "APP_REDUCER/RESET_LOADING_PROGRESS":
      return {
        ...state,
        loadingProgress: {
          percentage: 0,
          message: "",
        },
      };
    case "APP_REDUCER/GET_APP_STATE":
      return { ...state };
    default:
      return state;
  }
};

export default AppReducer;

