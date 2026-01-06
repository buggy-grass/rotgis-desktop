import store from "../store/store";
import ProjectActions from "../store/actions/ProjectActions";
import ProjectService from "./ProjectService";
import { serializeProjectXML } from "./XMLService";

let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DELAY = 500; // 500ms debounce

/**
 * Auto-save project when store changes
 */
export function setupProjectAutoSave() {
  let previousState = store.getState().projectReducer;

  store.subscribe(() => {
    const currentState = store.getState().projectReducer;

    // Only auto-save if:
    // 1. Project exists
    // 2. Project file path exists (project has been saved at least once)
    // 3. Project is dirty (has changes)
    // 4. Not currently saving
    // 5. Project actually changed (dirty flag changed from false to true, or project reference changed)
    const projectChanged = 
      currentState.project &&
      previousState.project &&
      ((currentState.isDirty && !previousState.isDirty) ||
       (currentState.isDirty && currentState.project !== previousState.project));

    if (
      currentState.project &&
      currentState.projectFilePath &&
      currentState.isDirty &&
      !currentState.isSaving &&
      projectChanged
    ) {
      // Clear existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      // Debounce auto-save
      saveTimeout = setTimeout(async () => {
        try {
          ProjectActions.setSaving(true);
          await ProjectService.saveProjectToFile(
            currentState.project!,
            currentState.projectFilePath!
          );
          ProjectActions.setDirty(false);
          console.log("Project auto-saved");
        } catch (error) {
          console.error("Error auto-saving project:", error);
        } finally {
          ProjectActions.setSaving(false);
        }
      }, SAVE_DELAY);
    }

    previousState = currentState;
  });
}

/**
 * Manual save (CTRL+S)
 */
export async function manualSaveProject(): Promise<void> {
  const state = store.getState().projectReducer;

  if (!state.project || !state.projectFilePath) {
    // Project not saved yet, return (dialog will handle first save)
    return;
  }

  if (state.isSaving) {
    return; // Already saving
  }

  try {
    ProjectActions.setSaving(true);
    await ProjectService.saveProjectToFile(state.project, state.projectFilePath);
    ProjectActions.setDirty(false);
    console.log("Project saved manually");
  } catch (error) {
    console.error("Error saving project:", error);
    throw error;
  } finally {
    ProjectActions.setSaving(false);
  }
}

