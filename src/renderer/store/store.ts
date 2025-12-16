import { combineReducers, legacy_createStore as createStore } from "redux";
import AppReducer from "./reducers/AppReducer";
import IAppState from "../models/IAppState";

const reducers = combineReducers({
  appReducer: AppReducer,
});

export type RootState = {
  appReducer: IAppState;
};

// Redux store
const store = createStore(reducers);

export default store;

