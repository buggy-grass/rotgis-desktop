import IAppState from "../../models/IAppState";
import store from "../store";

class AppActions {
  static getAppState(): IAppState {
    return store.getState().appReducer;
  }

  static setAppName(appName: string) {
    store.dispatch({
      type: "APP_REDUCER/SET_APP_NAME",
      payload: { appName },
    });
  }

  static setProjectName(projectName: string) {
    store.dispatch({
      type: "APP_REDUCER/SET_PROJECT_NAME",
      payload: { projectName },
    });
  }

  static setLoading(isLoading: boolean) {
    store.dispatch({
      type: "APP_REDUCER/SET_LOADING",
      payload: { isLoading },
    });
  }

  static setLoadingProgress(percentage: number, message: string) {
    store.dispatch({
      type: "APP_REDUCER/SET_LOADING_PROGRESS",
      payload: { percentage, message },
    });
  }

  static resetLoadingProgress() {
    store.dispatch({
      type: "APP_REDUCER/RESET_LOADING_PROGRESS",
    });
  }
}

export default AppActions;

