import IProjectState from "../../models/IProjectState";
import store from "../store";
import { ProjectXML, PointCloud, Mesh, Orthophoto } from "../../types/ProjectTypes";

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

  /**
   * Add a point cloud to the project
   * @param pointCloud PointCloud object to add
   */
  static addPointCloud(pointCloud: PointCloud) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot add point cloud: No project loaded");
      return;
    }

    // Check if point cloud with same ID or same path already exists
    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const existsById = existingPointClouds.some((pc) => pc.id === pointCloud.id);
    const existsByPath = existingPointClouds.some((pc) => pc.path === pointCloud.path);
    
    if (existsById) {
      console.warn(`Point cloud with ID ${pointCloud.id} already exists, skipping add`);
      return;
    }

    if (existsByPath) {
      console.warn(`Point cloud with path ${pointCloud.path} already exists, skipping add`);
      return;
    }

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: [
          ...existingPointClouds,
          pointCloud,
        ],
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Add a DTM to the project
   * @param dtm Orthophoto object representing DTM
   */
  static addDTM(dtm: Orthophoto) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot add DTM: No project loaded");
      return;
    }

    // Check if DTM with same ID or same path already exists
    const existingDTMs = currentState.project.metadata.dtm || [];
    const existsById = existingDTMs.some((d) => d.id === dtm.id);
    const existsByPath = existingDTMs.some((d) => d.path === dtm.path);
    
    if (existsById) {
      console.warn(`DTM with ID ${dtm.id} already exists, skipping add`);
      return;
    }

    if (existsByPath) {
      console.warn(`DTM with path ${dtm.path} already exists, skipping add`);
      return;
    }

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        dtm: [
          ...existingDTMs,
          dtm,
        ],
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Add a DSM to the project
   * @param dsm Orthophoto object representing DSM
   */
  static addDSM(dsm: Orthophoto) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot add DSM: No project loaded");
      return;
    }

    // Check if DSM with same ID or same path already exists
    const existingDSMs = currentState.project.metadata.dsm || [];
    const existsById = existingDSMs.some((d) => d.id === dsm.id);
    const existsByPath = existingDSMs.some((d) => d.path === dsm.path);
    
    if (existsById) {
      console.warn(`DSM with ID ${dsm.id} already exists, skipping add`);
      return;
    }

    if (existsByPath) {
      console.warn(`DSM with path ${dsm.path} already exists, skipping add`);
      return;
    }

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        dsm: [
          ...existingDSMs,
          dsm,
        ],
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Add an orthophoto to the project
   * @param orthophoto Orthophoto object to add
   */
  static addOrthophoto(orthophoto: Orthophoto) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot add orthophoto: No project loaded");
      return;
    }

    // Check if orthophoto with same ID already exists
    const existingOrthophotos = currentState.project.metadata.orthophoto || [];
    const exists = existingOrthophotos.some((o) => o.id === orthophoto.id);
    
    if (exists) {
      console.warn(`Orthophoto with ID ${orthophoto.id} already exists, skipping add`);
      return;
    }

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        orthophoto: [
          ...existingOrthophotos,
          orthophoto,
        ],
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Add a mesh to the project
   * @param mesh Mesh object to add
   */
  static addMesh(mesh: Mesh) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot add mesh: No project loaded");
      return;
    }

    // Check if mesh with same ID already exists
    const existingMeshes = currentState.project.metadata.mesh || [];
    const exists = existingMeshes.some((m) => m.id === mesh.id);
    
    if (exists) {
      console.warn(`Mesh with ID ${mesh.id} already exists, skipping add`);
      return;
    }

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        mesh: [
          ...existingMeshes,
          mesh,
        ],
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }
}

export default ProjectActions;

