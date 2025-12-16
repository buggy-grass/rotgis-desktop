import IStatusBar from "../../models/IStatusBar";
import store from "../store";

class StatusBarActions {
  static getStatusBarState(): IStatusBar {
    return store.getState().statusBarReducer;
  }

  static setCoordinates(x: number, y: number, z: number) {
    store.dispatch({
      type: "STATUS_BAR/SET_COORDINATES",
      payload: { x, y, z },
    });
  }

  static clearCoords() {
    store.dispatch({
      type: "STATUS_BAR/CLEAR_COORDS",
    });
  }
}
export default StatusBarActions;
