import { ProjectXML } from "../types/ProjectTypes";

export default interface IProjectState {
  project: ProjectXML | null;
  projectFilePath: string | null;
  projectFolderPath: string | null;
  isDirty: boolean;
  isSaving: boolean;
}

