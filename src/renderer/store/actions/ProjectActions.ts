import IProjectState from "../../models/IProjectState";
import store from "../store";
import { ProjectXML, PointCloud, Mesh, Orthophoto, MeasurementLayer, AnnotationLayer } from "../../types/ProjectTypes";

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

    // Ensure visible is set (default to true)
    const pointCloudWithVisible = {
      ...pointCloud,
      visible: pointCloud.visible !== false,
    };

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: [
          ...existingPointClouds,
          pointCloudWithVisible,
        ],
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Update point cloud visibility
   * @param pointCloudId The ID of the point cloud
   * @param visible The visibility state
   */
  static updatePointCloudVisibility(pointCloudId: string, visible: boolean) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot update point cloud visibility: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const updatedPointClouds = existingPointClouds.map((pc) => {
      if (pc.id === pointCloudId) {
        return {
          ...pc,
          visible: visible,
        };
      }
      return pc;
    });

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Delete a point cloud from the project
   * @param pointCloudId The ID of the point cloud to delete
   */
  static deletePointCloud(pointCloudId: string) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot delete point cloud: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const updatedPointClouds = existingPointClouds.filter((pc) => pc.id !== pointCloudId);

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
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

    // Skip if DTM has no ID or empty ID
    if (!dtm.id || dtm.id.trim() === '') {
      console.warn("Cannot add DTM: DTM has no ID or empty ID");
      return;
    }

    // Check if DTM with same ID, path, or asset already exists
    const existingDTMs = currentState.project.metadata.dtm || [];
    
    // Normalize paths for comparison
    const normalizePath = (path: string | undefined | null): string => {
      if (!path) return '';
      return path.replace(/\\/g, '/').toLowerCase().trim();
    };
    
    const normalizedNewPath = normalizePath(dtm.path);
    const normalizedNewAsset = normalizePath(dtm.asset);
    
    // Check for duplicates - more comprehensive check
    const existsById = existingDTMs.some((d) => d.id && d.id.trim() !== '' && d.id === dtm.id);
    const existsByPath = normalizedNewPath && normalizedNewPath !== '' && existingDTMs.some((d) => {
      const normalizedExistingPath = normalizePath(d.path);
      return normalizedExistingPath && normalizedExistingPath !== '' && normalizedExistingPath === normalizedNewPath;
    });
    const existsByAsset = normalizedNewAsset && normalizedNewAsset !== '' && existingDTMs.some((d) => {
      const normalizedExistingAsset = normalizePath(d.asset);
      return normalizedExistingAsset && normalizedExistingAsset !== '' && normalizedExistingAsset === normalizedNewAsset;
    });
    
    if (existsById) {
      console.warn(`DTM with ID ${dtm.id} already exists, skipping add`);
      return;
    }

    if (existsByPath) {
      console.warn(`DTM with path ${dtm.path} already exists, skipping add`);
      return;
    }

    if (existsByAsset) {
      console.warn(`DTM with asset ${dtm.asset} already exists, skipping add`);
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

    // Skip if DSM has no ID or empty ID
    if (!dsm.id || dsm.id.trim() === '') {
      console.warn("Cannot add DSM: DSM has no ID or empty ID");
      return;
    }

    // Check if DSM with same ID, path, or asset already exists
    const existingDSMs = currentState.project.metadata.dsm || [];
    
    // Normalize paths for comparison
    const normalizePath = (path: string | undefined | null): string => {
      if (!path) return '';
      return path.replace(/\\/g, '/').toLowerCase().trim();
    };
    
    const normalizedNewPath = normalizePath(dsm.path);
    const normalizedNewAsset = normalizePath(dsm.asset);
    
    // Check for duplicates - more comprehensive check
    const existsById = existingDSMs.some((d) => d.id && d.id.trim() !== '' && d.id === dsm.id);
    const existsByPath = normalizedNewPath && normalizedNewPath !== '' && existingDSMs.some((d) => {
      const normalizedExistingPath = normalizePath(d.path);
      return normalizedExistingPath && normalizedExistingPath !== '' && normalizedExistingPath === normalizedNewPath;
    });
    const existsByAsset = normalizedNewAsset && normalizedNewAsset !== '' && existingDSMs.some((d) => {
      const normalizedExistingAsset = normalizePath(d.asset);
      return normalizedExistingAsset && normalizedExistingAsset !== '' && normalizedExistingAsset === normalizedNewAsset;
    });
    
    if (existsById) {
      console.warn(`DSM with ID ${dsm.id} already exists, skipping add`);
      return;
    }

    if (existsByPath) {
      console.warn(`DSM with path ${dsm.path} already exists, skipping add`);
      return;
    }

    if (existsByAsset) {
      console.warn(`DSM with asset ${dsm.asset} already exists, skipping add`);
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

    // Check if orthophoto with same ID, path, or asset already exists
    const existingOrthophotos = currentState.project.metadata.orthophoto || [];
    
    // Normalize paths for comparison
    const normalizePath = (path: string | undefined | null): string => {
      if (!path) return '';
      return path.replace(/\\/g, '/').toLowerCase().trim();
    };
    
    const normalizedNewPath = normalizePath(orthophoto.path);
    const normalizedNewAsset = normalizePath(orthophoto.asset);
    
    // Check for duplicates
    const existsById = existingOrthophotos.some((o) => o.id === orthophoto.id);
    const existsByPath = normalizedNewPath && existingOrthophotos.some((o) => {
      const normalizedExistingPath = normalizePath(o.path);
      return normalizedExistingPath === normalizedNewPath;
    });
    const existsByAsset = normalizedNewAsset && existingOrthophotos.some((o) => {
      const normalizedExistingAsset = normalizePath(o.asset);
      return normalizedExistingAsset === normalizedNewAsset;
    });
    
    if (existsById) {
      console.warn(`Orthophoto with ID ${orthophoto.id} already exists, skipping add`);
      return;
    }

    if (existsByPath) {
      console.warn(`Orthophoto with path ${orthophoto.path} already exists, skipping add`);
      return;
    }

    if (existsByAsset) {
      console.warn(`Orthophoto with asset ${orthophoto.asset} already exists, skipping add`);
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

  /**
   * Add a measurement layer to a point cloud
   * @param pointCloudId The ID of the point cloud
   * @param measurementLayer The measurement layer to add
   */
  static addMeasurementLayer(pointCloudId: string, measurementLayer: MeasurementLayer) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot add measurement layer: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const pointCloudIndex = existingPointClouds.findIndex((pc) => pc.id === pointCloudId);

    if (pointCloudIndex === -1) {
      console.error(`Cannot add measurement layer: Point cloud with ID ${pointCloudId} not found`);
      return;
    }

    const pointCloud = existingPointClouds[pointCloudIndex];
    const existingLayers = pointCloud.layers || [];

    // Check if layer with same ID already exists
    const existsById = existingLayers.some((layer) => layer.id === measurementLayer.id);
    if (existsById) {
      console.warn(`Measurement layer with ID ${measurementLayer.id} already exists, skipping add`);
      return;
    }

    const updatedPointCloud = {
      ...pointCloud,
      layers: [...existingLayers, measurementLayer],
    };

    const updatedPointClouds = [...existingPointClouds];
    updatedPointClouds[pointCloudIndex] = updatedPointCloud;

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Add an annotation layer to a point cloud
   * @param pointCloudId The ID of the point cloud (modelData.id)
   * @param annotationLayer The annotation layer to add
   */
  static addAnnotationLayer(pointCloudId: string, annotationLayer: AnnotationLayer) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot add annotation layer: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const pointCloudIndex = existingPointClouds.findIndex((pc) => pc.id === pointCloudId);

    if (pointCloudIndex === -1) {
      console.error(`Cannot add annotation layer: Point cloud with ID ${pointCloudId} not found`);
      return;
    }

    const pointCloud = existingPointClouds[pointCloudIndex];
    const existingLayers = pointCloud.layers || [];

    const existsById = existingLayers.some((layer) => layer.id === annotationLayer.id);
    if (existsById) {
      console.warn(`Annotation layer with ID ${annotationLayer.id} already exists, skipping add`);
      return;
    }

    const updatedPointCloud = {
      ...pointCloud,
      layers: [...existingLayers, annotationLayer],
    };

    const updatedPointClouds = [...existingPointClouds];
    updatedPointClouds[pointCloudIndex] = updatedPointCloud;

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Remove an annotation layer from a point cloud
   * @param pointCloudId The ID of the point cloud
   * @param layerId The ID of the annotation layer to remove
   */
  static removeAnnotationLayer(pointCloudId: string, layerId: string) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot remove annotation layer: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const pointCloudIndex = existingPointClouds.findIndex((pc) => pc.id === pointCloudId);

    if (pointCloudIndex === -1) {
      console.error(`Cannot remove annotation layer: Point cloud with ID ${pointCloudId} not found`);
      return;
    }

    const pointCloud = existingPointClouds[pointCloudIndex];
    const existingLayers = pointCloud.layers || [];
    const updatedLayers = existingLayers.filter((layer) => layer.id !== layerId);

    const updatedPointCloud = {
      ...pointCloud,
      layers: updatedLayers,
    };

    const updatedPointClouds = [...existingPointClouds];
    updatedPointClouds[pointCloudIndex] = updatedPointCloud;

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Update annotation layer visibility
   * @param pointCloudId The ID of the point cloud
   * @param layerId The ID of the annotation layer
   * @param visible The visibility state
   */
  static updateAnnotationLayerVisibility(
    pointCloudId: string,
    layerId: string,
    visible: boolean
  ) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot update annotation layer visibility: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const pointCloudIndex = existingPointClouds.findIndex((pc) => pc.id === pointCloudId);

    if (pointCloudIndex === -1) {
      console.error(`Cannot update annotation layer: Point cloud with ID ${pointCloudId} not found`);
      return;
    }

    const pointCloud = existingPointClouds[pointCloudIndex];
    const existingLayers = pointCloud.layers || [];
    const updatedLayers = existingLayers.map((layer) => {
      if (layer.id === layerId) {
        return { ...layer, visible };
      }
      return layer;
    });

    const updatedPointCloud = {
      ...pointCloud,
      layers: updatedLayers,
    };

    const updatedPointClouds = [...existingPointClouds];
    updatedPointClouds[pointCloudIndex] = updatedPointCloud;

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Update measurement layer visibility
   * @param pointCloudId The ID of the point cloud
   * @param layerId The ID of the measurement layer
   * @param visible The visibility state
   */
  static updateMeasurementLayerVisibility(
    pointCloudId: string,
    layerId: string,
    visible: boolean
  ) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot update measurement layer visibility: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const pointCloudIndex = existingPointClouds.findIndex((pc) => pc.id === pointCloudId);

    if (pointCloudIndex === -1) {
      console.error(`Cannot update measurement layer: Point cloud with ID ${pointCloudId} not found`);
      return;
    }

    const pointCloud = existingPointClouds[pointCloudIndex];
    const existingLayers = pointCloud.layers || [];
    const updatedLayers = existingLayers.map((layer) => {
      if (layer.id === layerId) {
        return { ...layer, visible };
      }
      return layer;
    });

    const updatedPointCloud = {
      ...pointCloud,
      layers: updatedLayers,
    };

    const updatedPointClouds = [...existingPointClouds];
    updatedPointClouds[pointCloudIndex] = updatedPointCloud;

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Update a measurement layer with new data
   * @param pointCloudId The ID of the point cloud
   * @param measurementLayer The updated measurement layer
   */
  static updateMeasurementLayer(pointCloudId: string, measurementLayer: MeasurementLayer) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot update measurement layer: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const pointCloudIndex = existingPointClouds.findIndex((pc) => pc.id === pointCloudId);

    if (pointCloudIndex === -1) {
      console.error(`Cannot update measurement layer: Point cloud with ID ${pointCloudId} not found`);
      return;
    }

    const pointCloud = existingPointClouds[pointCloudIndex];
    const existingLayers = pointCloud.layers || [];

    // Check if layer exists
    const layerIndex = existingLayers.findIndex((layer) => layer.id === measurementLayer.id);
    if (layerIndex === -1) {
      console.warn(`Measurement layer with ID ${measurementLayer.id} not found, cannot update`);
      return;
    }

    // Update the layer
    const updatedLayers = [...existingLayers];
    updatedLayers[layerIndex] = measurementLayer;

    const updatedPointCloud = {
      ...pointCloud,
      layers: updatedLayers,
    };

    const updatedPointClouds = [...existingPointClouds];
    updatedPointClouds[pointCloudIndex] = updatedPointCloud;

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }

  /**
   * Remove a measurement layer from a point cloud
   * @param pointCloudId The ID of the point cloud
   * @param layerId The ID of the measurement layer to remove
   */
  static removeMeasurementLayer(pointCloudId: string, layerId: string) {
    const currentState = store.getState().projectReducer;
    if (!currentState.project) {
      console.error("Cannot remove measurement layer: No project loaded");
      return;
    }

    const existingPointClouds = currentState.project.metadata.pointCloud || [];
    const pointCloudIndex = existingPointClouds.findIndex((pc) => pc.id === pointCloudId);

    if (pointCloudIndex === -1) {
      console.error(`Cannot remove measurement layer: Point cloud with ID ${pointCloudId} not found`);
      return;
    }

    const pointCloud = existingPointClouds[pointCloudIndex];
    const existingLayers = pointCloud.layers || [];
    const updatedLayers = existingLayers.filter((layer) => layer.id !== layerId);

    const updatedPointCloud = {
      ...pointCloud,
      layers: updatedLayers,
    };

    const updatedPointClouds = [...existingPointClouds];
    updatedPointClouds[pointCloudIndex] = updatedPointCloud;

    const updatedProject: ProjectXML = {
      ...currentState.project,
      metadata: {
        ...currentState.project.metadata,
        pointCloud: updatedPointClouds,
      },
    };

    store.dispatch({
      type: "PROJECT/UPDATE_PROJECT",
      payload: { project: updatedProject },
    });
  }
}

export default ProjectActions;

