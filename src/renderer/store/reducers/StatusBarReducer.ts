import IStatusBar from "../../models/IStatusBar";
import IActionsProps from "../../models/IActionsProps";
import { Reducer } from "redux";

const initialState: IStatusBar = {
  coordinates: {
    x: 0,
    y: 0,
    z: 0,
  },
  operation: {
    name: "Ready",
    icon: undefined,
  },
};

const StatusBarReducer: Reducer<IStatusBar, IActionsProps> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case "STATUS_BAR/SET_COORDINATES":
      return {
        ...state,
        coordinates: {
          x: action.payload.x,
          y: action.payload.y,
          z: action.payload.z,
        },
      };
    case "STATUS_BAR/CLEAR_COORDS":
      return {
        ...state,
        coordinates: {
          x: 0,
          y: 0,
          z: 0,
        },
      };
    case "STATUS_BAR/SET_OPERATION":
      return {
        ...state,
        operation: {
          name: action.payload.name,
          icon: action.payload.icon,
        },
      };
    case "STATUS_BAR/GET_STATUS_BAR_STATE":
      return { ...state };
    default:
      return state;
  }
};

export default StatusBarReducer;
