import { combineReducers, legacy_createStore as createStore } from "redux";
import AppReducer from "./reducers/AppReducer";
import IAppState from "../models/IAppState";
import StatusBarReducer from "./reducers/StatusBarReducer";
import IStatusBar from "../models/IStatusBar";

const reducers = combineReducers({
  appReducer: AppReducer,
  statusBarReducer: StatusBarReducer,
});

export type RootState = {
  appReducer: IAppState;
  statusBarReducer: IStatusBar;
};

// Redux store
const store = createStore(reducers);

export default store;

