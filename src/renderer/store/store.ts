import { combineReducers, legacy_createStore as createStore } from "redux";
import AppReducer from "./reducers/AppReducer";
import IAppState from "../models/IAppState";
import StatusBarReducer from "./reducers/StatusBarReducer";
import IStatusBar from "../models/IStatusBar";
import ProjectReducer from "./reducers/ProjectReducer";
import IProjectState from "../models/IProjectState";

const reducers = combineReducers({
  appReducer: AppReducer,
  statusBarReducer: StatusBarReducer,
  projectReducer: ProjectReducer,
});

export type RootState = {
  appReducer: IAppState;
  statusBarReducer: IStatusBar;
  projectReducer: IProjectState;
};

// Redux store
const store = createStore(reducers);

export default store;

