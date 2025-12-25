import IProjectState from "../../models/IProjectState";
import store from "../store";
import { ProjectXML } from "../../types/ProjectTypes";

class ProjectActions {
  static getProjectState(): IProjectState {
    return store.getState().projectReducer;
  }

  static setProject(project: ProjectXML) {
    store.dispatch({
      type: "PROJECT/SET_PROJECT",
      payload: { project },
    });
  }

  static updateProject(project: ProjectXML) {
    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project },
    });
  }

  static setProjectPaths(projectFilePath: string | null, projectFolderPath: string | null) {
    store.dispatch({
      type: "PROJECT/SET_PROJECT_PATHS",
      payload: { projectFilePath, projectFolderPath },
    });
  }

  static setDirty(isDirty: boolean) {
    store.dispatch({
      type: "PROJECT/SET_DIRTY",
      payload: { isDirty },
    });
  }

  static setSaving(isSaving: boolean) {
    store.dispatch({
      type: "PROJECT/SET_SAVING",
      payload: { isSaving },
    });
  }

  static clearProject() {
    store.dispatch({
      type: "PROJECT/CLEAR_PROJECT",
    });
  }
}

export default ProjectActions;

