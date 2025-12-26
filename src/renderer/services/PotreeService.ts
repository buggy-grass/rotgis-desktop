import path from "path";

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

  static deletePointCloud(id: string) {
    if (window.viewer) {
      const pointClouds = window.viewer.scene.pointclouds;
      for (let i = pointClouds.length - 1; i >= 0; i--) {
        const pc = pointClouds[i];
        if (pc.name == id) {
          window.viewer.scene.scenePointCloud.remove(pointClouds[i]);
          pc.root.geometryNode.dispose();
          pointClouds.splice(i, 1);

          const geometryNode = pc.root.geometryNode;
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
    PotreeService.setRadius(1.4);
    PotreeService.setEDLStrength(0.4);
    PotreeService.setEdleOpacity(1);
    PotreeService.setNodeSize(30);
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

      let options = [
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
      let options = [
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

    if (1 == 1) {
      throw "failed";
    }

    // TO DO import cropped point cloud to the project

    return "success";
  }

  static async getMaxZInPolygon(source: string, wkt: string) {
    try {
      let options = [
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
        window.viewer.zoomTo(node, 1.0, 500);
      } else {
        // Fallback: direct zoom
        window.viewer.zoomTo(pointCloud, 1.0, 500);
      }
    } catch (error) {
      // Last resort: direct zoom
      try {
        window.viewer.zoomTo(pointCloud, 1.0, 500);
      } catch (fallbackError) {
      }
    }
  }
}
export default PotreeService;
