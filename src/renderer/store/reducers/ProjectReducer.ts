import IProjectState from "../../models/IProjectState";
import IActionsProps from "../../models/IActionsProps";
import { Reducer } from "redux";
import { ProjectXML } from "../../types/ProjectTypes";

const initialState: IProjectState = {
  project: null,
  projectFilePath: null,
  projectFolderPath: null,
  isDirty: false,
  isSaving: false,
};

const ProjectReducer: Reducer<IProjectState, IActionsProps> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case "PROJECT/SET_PROJECT":
      return {
        ...state,
        project: action.payload.project,
        isDirty: true,
      };
    case "PROJECT/UPDATE_PROJECT":
      return {
        ...state,
        project: action.payload.project,
        isDirty: true,
      };
    case "PROJECT/SET_PROJECT_PATHS":
      return {
        ...state,
        projectFilePath: action.payload.projectFilePath,
        projectFolderPath: action.payload.projectFolderPath,
      };
    case "PROJECT/SET_DIRTY":
      return {
        ...state,
        isDirty: action.payload.isDirty,
      };
    case "PROJECT/SET_SAVING":
      return {
        ...state,
        isSaving: action.payload.isSaving,
      };
    case "PROJECT/CLEAR_PROJECT":
      return {
        ...initialState,
      };
    case "PROJECT/GET_PROJECT_STATE":
      return { ...state };
    default:
      return state;
  }
};

export default ProjectReducer;

