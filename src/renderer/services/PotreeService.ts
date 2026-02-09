import path from "path";
import PathService from "./PathService";
import DirectoryService from "./DirectoryService";
import ProjectActions from "../store/actions/ProjectActions";
import ProjectService from "./ProjectService";
import { MeasurementLayer } from "../types/ProjectTypes";

interface Coordinate extends Array<number> {}

export interface BoundaryJSON {
  type: "MultiPolygon";
  coordinates: Coordinate[][][];
}

export interface BoundaryData {
  boundary: {
    area: number;
    avg_pt_per_sq_unit: number;
    avg_pt_spacing: number;
    boundary: string; // WKT formatında
    boundary_json: BoundaryJSON;
  };
}

class PotreeService {
  static async getCurrentViewerOptions(): Promise<{
    pointDensity: number;
    fieldOfView: number;
    radius: number;
    edlStrength: number;
    edleOpacity: number;
    background: string;
    nodeSize: number;
    edle: boolean;
    pointHQ: boolean;
    pointSizeType: number;
  }> {
    const pointDensity = window.viewer.getPointBudget();
    const fieldOfView = window.viewer.getFOV();
    const radius = window.viewer.getEDLRadius();
    const edlStrength = window.viewer.getEDLStrength();
    const edleOpacity = window.viewer.getEDLOpacity();
    const background = window.viewer.getBackground();
    const nodeSize = window.viewer.getMinNodeSize();
    const edle = window.viewer.getEDLEnabled();
    const pointHQ = window.viewer.useHQ;
    const pointSizeType = window.pointSizeType;

    return {
      pointDensity,
      fieldOfView,
      radius,
      edlStrength,
      edleOpacity,
      background,
      nodeSize,
      edle,
      pointHQ,
      pointSizeType,
    };
  }

  static getVectorBbox = (vector: any) => {
    const bbox = new window.THREE.Box3().setFromObject(vector);
    return bbox;
  };

  static zoomToBBox = (type: string) => {
    let box;
    let max_x = -Infinity;
    let max_y = -Infinity;
    let max_z = -Infinity;
    let min_x = Infinity;
    let min_y = Infinity;
    let min_z = Infinity;
    const objects = window.viewer.scene.scene.children;
    if (type == "mesh") {
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (obj.droType === "droImageLayer") {
          for (const child of obj.children) {
            const { x, y, z } = child.position;

            max_x = Math.max(max_x, x);
            max_y = Math.max(max_y, y);
            max_z = Math.max(max_z, z);

            min_x = Math.min(min_x, x);
            min_y = Math.min(min_y, y);
            min_z = Math.min(min_z, z);
          }
          continue; // buradan sonrası mesh için olan kısma geçmesin
        }

        if (objects[i].children.length == 0) {
          box = PotreeService.getVectorBbox(objects[i]);
        } else {
          box = PotreeService.getVectorBbox(objects[i].children[0]);
        }
        if (box.max.x > max_x) {
          max_x = box.max.x;
        }
        if (box.max.y > max_y) {
          max_y = box.max.y;
        }
        if (box.max.z > max_z) {
          max_z = box.max.z;
        }

        if (box.min.x < min_x) {
          min_x = box.min.x;
        }
        if (box.min.y < min_y) {
          min_y = box.min.y;
        }
        if (box.min.z < min_z) {
          min_z = box.min.z;
        }
      }
    } else if (type == "pc") {
      box = window.viewer.getBoundingBox(window.viewer.scene.pointclouds);
      if (box.max.x > max_x) {
        max_x = box.max.x;
      }
      if (box.max.y > max_y) {
        max_y = box.max.y;
      }
      if (box.max.z > max_z) {
        max_z = box.max.z;
      }

      if (box.min.x < min_x) {
        min_x = box.min.x;
      }
      if (box.min.y < min_y) {
        min_y = box.min.y;
      }
      if (box.min.z < min_z) {
        min_z = box.min.z;
      }
    }

    const threebbox = new window.THREE.Box3();
    threebbox.max.x = max_x;
    threebbox.max.y = max_y;
    threebbox.max.z = max_z;
    threebbox.min.x = min_x;
    threebbox.min.y = min_y;
    threebbox.min.z = min_z;

    const node = new window.THREE.Object3D();
    node.boundingBox = threebbox;
    window.viewer.zoomTo(node, 1, 500);
  };
  /**
   * Deletes a point cloud: removes its measurements/annotations from Potree,
   * removes the point cloud from the viewer, optionally deletes folder from disk,
   * and always removes it from Redux.
   */
  static async deletePointCloud(id: string) {
    if (!window.viewer) return;

    const pointClouds = window.viewer.scene.pointclouds;
    const index = pointClouds.findIndex((pc: any) => pc.name === id);
    if (index === -1) {
      // Not in viewer (e.g. already removed or never loaded) – still remove from Redux
      ProjectActions.deletePointCloud(id);
      return;
    }

    const pc = pointClouds[index];
    const pointCloudId = pc.name;

    // 1) Remove all measurements and annotations for this point cloud from Potree (before removing pc)
    const projectState = ProjectActions.getProjectState();
    const metadataPc = projectState.project?.metadata?.pointCloud?.find(
      (p) => p.id === pointCloudId
    );
    if (metadataPc?.layers) {
      for (const layer of metadataPc.layers) {
        if (layer.type === "measurement") {
          PotreeService.removeMeasurement(layer.id);
        }
        if (layer.type === "annotation") {
          PotreeService.removeAnnotation(layer.id);
        }
      }
    }

    // 2) Remove point cloud from Potree scene and dispose
    window.viewer.scene.scenePointCloud.remove(pc);
    pc.root.geometryNode.dispose();
    pointClouds.splice(index, 1);

    const geometryNode = pc.root.geometryNode;
    let sceneNode = pc.root.sceneNode;
    const parent = pc.root;
    const childIndex = parseInt(
      geometryNode.name[geometryNode.name.length - 1],
      10
    );
    parent.sceneNode.remove(sceneNode);

    if (sceneNode.geometry) {
      const attributes = sceneNode.geometry.attributes;
      for (const key in attributes) {
        if (key === "position") delete attributes[key].array;
        delete attributes[key];
      }
      sceneNode.geometry.dispose();
      sceneNode.geometry = undefined;
    }
    if (sceneNode.material) {
      if (sceneNode.material.map) {
        sceneNode.material.map.dispose();
        sceneNode.material.map = undefined;
      }
      sceneNode.material.dispose();
      sceneNode.material = undefined;
    }
    delete sceneNode.matrix;
    delete sceneNode.matrixWorld;
    delete sceneNode.position?.array;
    delete sceneNode.quaternion?.array;
    delete sceneNode.rotation?.array;
    delete sceneNode.scale?.array;
    delete sceneNode.up?.array;
    sceneNode = undefined;
    parent.children[childIndex] = geometryNode;

    // 3) Delete folder from disk if it exists
    try {
      const pcFolderPath = await PathService.directoryPath(
        pc.pcoGeometry.loader.url
      );
      const exist = await DirectoryService.exist(pcFolderPath);
      if (exist) await DirectoryService.delete(pcFolderPath);
    } catch (_) {
      // Ignore disk errors; we still want to update Redux
    }

    // 4) Always remove from Redux so UI and project file stay in sync
    ProjectActions.deletePointCloud(pointCloudId);
  }

  /**
   * Syncs visibility of all measurement and annotation layers for a point cloud
   * from Redux to Potree scene (measurements and annotations).
   */
  static setPointCloudLayersVisibility(pointCloudId: string, visible: boolean): void {
    if (!window.viewer?.scene) return;

    const projectState = ProjectActions.getProjectState();
    const metadataPc = projectState.project?.metadata?.pointCloud?.find(
      (p) => p.id === pointCloudId
    );
    if (!metadataPc?.layers) return;

    for (const layer of metadataPc.layers) {
      if (layer.type === "measurement") {
        const measure = window.viewer.scene.measurements.find(
          (m: any) => m.uuid === layer.id
        );
        if (measure) measure.visible = visible;
      }
      if (layer.type === "annotation") {
        const ann = window.viewer.scene.annotations?.children?.find(
          (a: any) => a.uuid === layer.id
        );
        if (ann) ann.visible = visible;
      }
    }
  }

  /**
   * Annotation'ı Potree viewer'dan kaldırır (scene.annotations children'dan).
   */
  static removeAnnotation(annotationId: string): void {
    try {
      if (!window.viewer?.scene?.annotations) return;

      const root = window.viewer.scene.annotations as {
        traverse: (fn: (a: any) => void) => void;
        remove: (annotation: any) => void;
      };
      const annotations = window.viewer.scene.annotations.children ?? [];
      const existAnnotation = annotations.find((a: any) => a.uuid === annotationId);
      if (existAnnotation) root.remove(existAnnotation);
      let found: any = null;
      root.traverse((a: any) => {
        if (a.uuid === annotationId || (a.id != null && String(a.id) === String(annotationId))) {
          found = a;
        }
      });
      if (found && found.parent && typeof found.parent.remove === "function") {
        found.parent.remove(found);
      }
    } catch (error) {
      console.error("PotreeService.removeAnnotation:", error);
    }
  }

  /**
   * Measurement'ı Potree viewer'dan garanti siler: measurements dizisinden + measuring tool sahnesinden.
   */
  static removeMeasurement(id: string): void {
    try {
      if (!window.viewer?.scene) return;

      const scene = window.viewer.scene;
      const measuringTool = (window.viewer as any).measuringTool;
      const matchId = (m: any) =>
        m.uuid === id || m.uuid === String(id) || (m.id != null && String(m.id) === String(id));

      // Önce measurements dizisinden bul
      let measurement = scene.measurements.find(matchId);

      // Dizide yoksa measuring tool sahnesinin child'larında ara (senkron kaymasına karşı)
      if (!measurement && measuringTool?.scene?.children) {
        measurement = measuringTool.scene.children.find(
          (child: any) => child.uuid != null && matchId(child)
        ) as any;
      }

      if (!measurement) return;

      // 1) Measuring tool'un THREE.Scene'inden kaldır (ölçümler burada render ediliyor)
      if (measuringTool?.scene?.remove) {
        measuringTool.scene.remove(measurement);
      }
      // 2) Başka bir parent'a eklenmişse oradan da kaldır
      if (measurement.parent) {
        measurement.removeFromParent();
      }
      // 3) Potree scene.measurements dizisinden çıkar (dizide varsa)
      const idx = scene.measurements.indexOf(measurement);
      if (idx > -1) {
        scene.removeMeasurement(measurement);
      }
    } catch (error) {
      console.error("PotreeService.removeMeasurement:", error);
    }
  }

  static getPointCloudById(id: string) {
    const projects = window.viewer.scene.pointclouds;
    for (let j = 0; j < projects.length; j++) {
      if (projects[j].name == id) {
        return projects[j];
      }
    }
  }

  static setPointBudget(value: number) {
    window.viewer.setPointBudget(value);
  }

  static setFieldofView(value: number) {
    window.viewer.setFOV(value);
  }

  static setRadius(value: number) {
    window.viewer.setEDLRadius(value);
  }

  static setEDLStrength(value: number) {
    window.viewer.setEDLStrength(value);
  }

  static setEdleOpacity(value: number) {
    // if (viewer == 'all') {
    //   for (let i = 0; i < window.DroNetConfig.viewports.length; i++) {
    //     window.viewer.setEDLOpacity(value);
    //   }
    // } else {
    //   window.viewer.setEDLOpacity(value);
    // }
    window.viewer.setEDLOpacity(value);
  }

  static setQuality(value: boolean) {
    window.viewer.useHQ = value;
  }

  static setNodeSize(value: number) {
    window.viewer.setMinNodeSize(value);
  }

  static setbbox(value: number) {
    window.viewer.setShowBoundingBox(value);
  }

  static setEdle(value: boolean) {
    window.viewer.setEDLEnabled(value);
  }

  static setPointSizeTypes(value: number) {
    if (window.viewer) {
      window.pointSizeType = value;
      const pointClouds = window.viewer.scene.pointclouds;
      pointClouds.forEach((pc: any) => {
        pc.material.pointSizeType = value;
      });
    }
  }

  /**
   * Set default viewer options
   */
  static setDefaultViewerOptions() {
    if (!window.viewer) return;

    // Set default values
    PotreeService.setPointBudget(10000000);
    PotreeService.setFieldofView(60);
    PotreeService.setQuality(false);
    PotreeService.setEdle(true);
    PotreeService.setRadius(0.8);
    PotreeService.setEDLStrength(0.4);
    PotreeService.setEdleOpacity(1);
    PotreeService.setNodeSize(80);
    PotreeService.setPointSizeTypes(0);
    window.viewer.setBackground("gradient-grid");
  }

  static setElevationMin(id: string, value: number) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        existPointCloud.material.heightMin = value;
        existPointCloud.material.heightMinValue = value;
      }
    }
  }

  static setGradient(id: string, value: string) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        existPointCloud.material.gradient = window.Potree.Gradients[value];
        existPointCloud.material.gradientValue = value;
      }
    }
  }

  static setElevationMax(id: string, value: number) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        existPointCloud.material.heightMax = value;
        existPointCloud.material.heightMaxValue = value;
      }
    }
  }

  static changeView(id: string, value: string, index: number) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        existPointCloud.material.activeAttributeName = value;
        existPointCloud.material.coloringType = index;
      }
    }
  }

  static setGamma(id: string, value: number) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        existPointCloud.material.rgbGamma = value;
      }
    }
  }

  static setBrightness(id: string, value: number) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        existPointCloud.material.rgbBrightness = value;
      }
    }
  }

  static setContrast(id: string, value: number) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        existPointCloud.material.rgbContrast = value;
      }
    }
  }

  static async getCurrentColoringType(id: string) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      const existPointCloud = pointClouds.find((pc: any) => pc.name === id);
      if (existPointCloud) {
        return existPointCloud.material.coloringType;
      }
    }
  }

  static async removePointClouds(): Promise<boolean> {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      for (let i = pointClouds.length - 1; i >= 0; i--) {
        const pc = pointClouds[i];
        window.viewer.scene.scenePointCloud.remove(pointClouds[i]);
        pc.root?.geometryNode?.dispose();
        pointClouds.splice(i, 1);

        const geometryNode = pc.root.geometryNode;
        if (!geometryNode) {
          continue;
        }
        let sceneNode = pc.root.sceneNode;
        const parent = pc.root;
        const childIndex = parseInt(
          geometryNode.name[geometryNode.name.length - 1]
        );
        //parent.sceneNode.remove(node.sceneNode);
        //remove node from scene
        parent.sceneNode.remove(sceneNode);

        //check if has geometry it could be removed also...
        if (sceneNode.geometry) {
          //delete attributes solve a big memory leak...
          const attributes = sceneNode.geometry.attributes;
          for (const key in attributes) {
            if (key == "position") {
              delete attributes[key].array;
            }
            delete attributes[key];
          }
          //dispose geometry
          sceneNode.geometry.dispose();
          sceneNode.geometry = undefined;
        }

        //check if has material, can be removed...
        if (sceneNode.material) {
          //check if has material map, can be removed...
          if (sceneNode.material.map) {
            sceneNode.material.map.dispose();
            sceneNode.material.map = undefined;
          }
          //dispose material
          sceneNode.material.dispose();
          sceneNode.material = undefined;
        }

        //delete matrix
        delete sceneNode.matrix;
        //delete matrixWorld
        delete sceneNode.matrixWorld;
        //delete position
        delete sceneNode.position.array;
        //delete qa
        delete sceneNode.quaternion.array;
        //delete rotation
        delete sceneNode.rotation.array;
        //delete scale
        delete sceneNode.scale.array;
        //delete up
        delete sceneNode.up.array;
        //delete sceneNode
        sceneNode = undefined;
        parent.children[childIndex] = geometryNode;
      }
    }
    return true;
  }

  static clearClipVolumes() {
    if (window && window.viewer && window.viewer.scene) {
      if (window.viewer.scene.volumes.length > 0) {
        window.viewer.scene.removeAllClipVolumes();
      }
    }
  }

  static setMouseConfigurations(
    zoomButton?: number,
    rotateButton?: number,
    dragButton?: number,
    zoomSpeed?: number,
    rotationSpeed?: number
  ) {
    if (window.viewer) {
      // Eğer değer undefined ise, viewer'daki değeri de undefined yap (veya 0)
      // ?? operatörü yerine explicit undefined kontrolü yapıyoruz
      if (zoomButton !== undefined) {
        window.viewer.zoomButton = zoomButton;
      } else {
        window.viewer.zoomButton = undefined;
      }

      if (rotateButton !== undefined) {
        window.viewer.rotateButton = rotateButton;
      } else {
        window.viewer.rotateButton = undefined;
      }

      if (dragButton !== undefined) {
        window.viewer.dragButton = dragButton;
      } else {
        window.viewer.dragButton = undefined;
      }

      if (window.viewer.earthControls) {
        if (zoomSpeed !== undefined) {
          window.viewer.earthControls.fadeFactor = zoomSpeed;
        }
        if (rotationSpeed !== undefined) {
          window.viewer.earthControls.rotationSpeed = rotationSpeed;
        }
      }
    }
  }

  static async cropPointCloud(
    selection: "cube" | "polygon",
    name: string = "cropped_pc.laz",
    extension: string = "laz",
    source: string,
    destination: string = "",
    wkt: string | null,
    mode: "inside" | "outside"
  ) {
    name = `${name}.${extension}`;

    const project = "";
    const tempFolderName = "pointCloud_crop_temp";

    console.error(tempFolderName, project, destination);
    const tempFolderPath = "";

    let cropResult;

    if (selection == "cube") {
      if (!window.viewer || !window.viewer.scene) {
        return;
      }

      const volume = window.viewer.scene.volumes[0];
      if (!volume) return;

      volume.updateMatrixWorld(true);

      // Position - matrixWorld
      const position = new window.THREE.Vector3();
      position.setFromMatrixPosition(volume.matrixWorld);

      // Scale
      const scale = volume.scale.clone();

      // Rotation
      const quaternion = volume.quaternion.clone();

      // Quaternion
      const euler = new window.THREE.Euler();
      euler.setFromQuaternion(quaternion, "ZYX");

      let yaw = Number((euler.z * (180 / Math.PI)).toFixed(6));
      let pitch = Number((euler.y * (180 / Math.PI)).toFixed(6));
      let roll = Number((euler.x * (180 / Math.PI)).toFixed(6));

      if (isNaN(yaw) || !isFinite(yaw)) yaw = 0;
      if (isNaN(pitch) || !isFinite(pitch)) pitch = 0;
      if (isNaN(roll) || !isFinite(roll)) roll = 0;

      const options = [
        { name: "--run", value: "pdalRotatedCrop" },
        { name: "--i", value: `"${source}"` },
        { name: "--o", value: `"${path.join(tempFolderPath, name)}"` },

        { name: "--cx", value: `"${position.x}"` },
        { name: "--cy", value: `"${position.y}"` },
        { name: "--cz", value: `"${position.z}"` },

        { name: "--sx", value: `"${scale.x}"` },
        { name: "--sy", value: `"${scale.y}"` },
        { name: "--sz", value: `"${scale.z}"` },

        { name: "--yaw", value: `"${yaw}"` },
        { name: "--pitch", value: `"${pitch}"` },
        { name: "--roll", value: `"${roll}"` },

        { name: "--mode", value: mode },
      ];

      // TODO: box crop
      console.error(options);
    } else {
      const options = [
        { name: "--run", value: `pdalCrop` },
        { name: "--i", value: `"${source}"` },
        { name: "--o", value: `"${path.join(tempFolderPath, name)}"` },
        {
          name: "--wkt",
          value: `"${wkt}"`,
        },
        { name: "--mode", value: `"${mode}"` },
      ];

      // TODO: polygon crop
      console.error(options);
    }

    if (!cropResult) {
      return;
    }

    const croppedPointCloud = path.join(tempFolderPath, name);

    console.error(croppedPointCloud);

    // if (1 == 1) {
    //   throw "failed";
    // }

    // TO DO import cropped point cloud to the project

    return "success";
  }

  static async getMaxZInPolygon(source: string, wkt: string) {
    try {
      const options = [
        { name: "--run", value: "pdalMaxZInPolygon" },
        { name: "--i", value: source },
        { name: "--wkt", value: `"${wkt}"` },
      ];
      console.error(options);

      // TO DO: get max z in polygon

      const text = "[RESULT]: 123.456"; // Dummy result

      const match = text.match(/\[RESULT\]:\s*([\d.]+)/);

      const result = match ? parseFloat(match[1]) : null;

      return Number(result);
    } catch (error) {
      console.error(error);
      return 1;
    }
  }

  /**
   * Focus to a specific point cloud by its ID
   * @param pointCloudId The ID of the point cloud to focus on
   */
  static focusToPointCloud(pointCloudId: string) {
    if (!window.viewer) {
      return;
    }

    const pointClouds = window.viewer.scene.pointclouds;

    const pointCloud = pointClouds.find((pc: any) => pc.name === pointCloudId);

    if (!pointCloud) {
      return;
    }

    // Use bounding box approach - same as zoomToBBox
    try {
      const bbox = window.viewer.getBoundingBox([pointCloud]);
      if (bbox) {
        const node = new window.THREE.Object3D();
        node.boundingBox = bbox;
        window.viewer.zoomTo(node, 0.3, 500);
      } else {
        // Fallback: direct zoom
        window.viewer.zoomTo(pointCloud, 0.3, 500);
      }

      // Store the active point cloud ID in a global variable for measurement tracking
      (window as any).activePointCloudId = pointCloudId;
    } catch (error) {
      // Last resort: direct zoom
      try {
        window.viewer.zoomTo(pointCloud, 1.0, 500);
        (window as any).activePointCloudId = pointCloudId;
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    }
  }

  /**
   * Focus to a measurement by its extent (bounding box)
   * @param extent The bounding box of the measurement
   */
  static focusToMeasure(extent: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  }) {
    if (!window.viewer) {
      return;
    }

    try {
      const threebbox = new window.THREE.Box3();
      threebbox.min.set(extent.min.x, extent.min.y, extent.min.z);
      threebbox.max.set(extent.max.x, extent.max.y, extent.max.z);

      const node = new window.THREE.Object3D();
      node.boundingBox = threebbox;
      window.viewer.zoomTo(node, 1.0, 500);
    } catch (error) {
      console.error("Error focusing to measurement:", error);
    }
  }

  /**
   * Focus to a specific mesh by its ID
   * @param meshId The ID of the mesh to focus on
   */
  static focusToMesh(meshId: string) {
    if (!window.viewer) {
      return;
    }

    try {
      let box;
      let max_x = -Infinity;
      let max_y = -Infinity;
      let max_z = -Infinity;
      let min_x = Infinity;
      let min_y = Infinity;
      let min_z = Infinity;
      const objects = window.viewer.scene.scene.children;
      let meshFound = false;
      
      for (let i = 0; i < objects.length; i++) {
        if (objects[i].name == meshId && objects[i].modelType == "mesh") {
          meshFound = true;
          if (objects[i].children.length == 0) {
            box = PotreeService.getVectorBbox(objects[i]);
          } else {
            box = PotreeService.getVectorBbox(objects[i].children[0]);
          }
          if (box.max.x > max_x) {
            max_x = box.max.x;
          }
          if (box.max.y > max_y) {
            max_y = box.max.y;
          }
          if (box.max.z > max_z) {
            max_z = box.max.z;
          }

          if (box.min.x < min_x) {
            min_x = box.min.x;
          }
          if (box.min.y < min_y) {
            min_y = box.min.y;
          }
          if (box.min.z < min_z) {
            min_z = box.min.z;
          }
        }
      }
      
      if (meshFound && max_x !== -Infinity && min_x !== Infinity) {
        const threebbox = new window.THREE.Box3();
        threebbox.max.x = max_x;
        threebbox.max.y = max_y;
        threebbox.max.z = max_z;
        threebbox.min.x = min_x;
        threebbox.min.y = min_y;
        threebbox.min.z = min_z;

        const node = new window.THREE.Object3D();
        node.boundingBox = threebbox;
        window.viewer.zoomTo(node, 1, 500);
      } else {
        console.warn(`Mesh ${meshId} not found or bounding box is invalid`);
      }
    } catch (error) {
      console.error("Error focusing to mesh:", error);
    }
  }

  /**
   * Create measurement data from measurement object (similar to createMeasurementData in potree.js)
   * @param measurement The measurement object from Potree
   * @returns Measurement data object ready for saving
   */
  static createMeasurementData(measurement: any): {
    uuid: string;
    name: string;
    points: number[][];
    visible: boolean;
    showDistances: boolean;
    showCoordinates: boolean;
    showArea: boolean;
    closed: boolean;
    showAngles: boolean;
    showHeight: boolean;
    showCircle: boolean;
    showAzimuth: boolean;
    showEdges: boolean;
    color: number[];
  } {
    // Extract points - handle both position.toArray() and position object
    const points: number[][] = measurement.points.map((p: any) =>
      p.position.toArray()
    );

    // Extract color - handle both color.toArray() and color object
    let color: number[] = [1, 1, 0]; // Default yellow
    if (measurement.color) {
      if (
        measurement.color.toArray &&
        typeof measurement.color.toArray === "function"
      ) {
        color = measurement.color.toArray();
      } else if (Array.isArray(measurement.color)) {
        color = measurement.color;
      } else if (measurement.color.r !== undefined) {
        color = [
          measurement.color.r,
          measurement.color.g || 0,
          measurement.color.b || 0,
        ];
      }
    }

    const data = {
      uuid: measurement.uuid,
      name: measurement.name,
      points: points,
      visible: measurement.visible,
      showDistances: measurement.showDistances,
      showCoordinates: measurement.showCoordinates,
      showArea: measurement.showArea,
      closed: measurement.closed,
      showAngles: measurement.showAngles,
      showHeight: measurement.showHeight,
      showCircle: measurement.showCircle,
      showAzimuth: measurement.showAzimuth,
      showEdges: measurement.showEdges,
      color: color,
    };

    return data;
  }

  /**
   * Update measurement color in Redux, file, and Potree viewer
   * @param pointCloudId The ID of the point cloud containing the measurement
   * @param measurementId The ID of the measurement layer
   * @param color The new color as [r, g, b] array (0-1 range)
   */
  static async updateMeasurementColor(
    pointCloudId: string,
    measurementId: string,
    color: [number, number, number]
  ): Promise<void> {
    try {
      // 1. Update Redux
      const currentState = ProjectActions.getProjectState();
      if (!currentState.project) {
        console.error("Cannot update measurement color: No project loaded");
        return;
      }

      const pointClouds = currentState.project.metadata.pointCloud || [];
      const pointCloudIndex = pointClouds.findIndex(
        (pc) => pc.id === pointCloudId
      );

      if (pointCloudIndex === -1) {
        console.error(
          `Cannot update measurement color: Point cloud with ID ${pointCloudId} not found`
        );
        return;
      }

      const pointCloud = pointClouds[pointCloudIndex];
      const layers = pointCloud.layers || [];
      const layerIndex = layers.findIndex(
        (l) => l.id === measurementId && l.type === "measurement"
      );

      if (layerIndex === -1) {
        console.error(
          `Cannot update measurement color: Measurement layer with ID ${measurementId} not found`
        );
        return;
      }

      const measurementLayer = layers[layerIndex] as MeasurementLayer;
      const updatedMeasurementLayer: MeasurementLayer = {
        ...measurementLayer,
        color: color,
      };

      // Update Redux
      ProjectActions.updateMeasurementLayer(
        pointCloudId,
        updatedMeasurementLayer
      );

      // 2. Update Potree viewer
      if (window.viewer && window.viewer.scene) {
        const measurement = window.viewer.scene.measurements.find(
          (m: any) => m.uuid === measurementId
        );
        if (measurement) {
          measurement.color = new window.THREE.Color(
            color[0],
            color[1],
            color[2]
          );
        }
      }

      // 3. Save to file (auto-save will handle this via Redux store subscription)
      // The ProjectAutoSave service is already set up to save when Redux changes
      // So we don't need to explicitly save here
    } catch (error) {
      console.error("Error updating measurement color:", error);
      throw error;
    }
  }
}
export default PotreeService;
