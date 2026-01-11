import { combineReducers, legacy_createStore as createStore } from "redux";
import AppReducer from "./reducers/AppReducer";
import IAppState from "../models/IAppState";
import StatusBarReducer from "./reducers/StatusBarReducer";
import IStatusBar from "../models/IStatusBar";
import ProjectReducer from "./reducers/ProjectReducer";
import IProjectState from "../models/IProjectState";
import SettingsReducer from "./reducers/SettingsReducer";
import ISettingsState from "../models/ISettingsState";

const reducers = combineReducers({
  appReducer: AppReducer,
  statusBarReducer: StatusBarReducer,
  projectReducer: ProjectReducer,
  settingsReducer: SettingsReducer,
});

export type RootState = {
  appReducer: IAppState;
  statusBarReducer: IStatusBar;
  projectReducer: IProjectState;
  settingsReducer: ISettingsState;
};

// Redux store
const store = createStore(reducers);

export default store;

