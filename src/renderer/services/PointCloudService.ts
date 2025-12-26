import path from "path";
import ProjectActions from "../store/actions/ProjectActions";
import { PointCloud } from "../types/ProjectTypes";
import PathService from "./PathService";
import ShellCommandService from "./ShellCommandService";
import WindowsAPI from "./WindowsAPI";
import {v4 as uuid} from 'uuid';

interface IntersectedObject {
  point: {
    position: {
      x: number;
      y: number;
      z: number;
    };
  };
}

class PointCloudService {
  private static importingFiles = new Set<string>(); // Track currently importing files

  static async import(filePath: string) {
    // Prevent duplicate imports of the same file
    if (this.importingFiles.has(filePath)) {
      console.warn(`File ${filePath} is already being imported, skipping duplicate import`);
      return;
    }

    this.importingFiles.add(filePath);

    try {
      const shortPath = await WindowsAPI.generateShortPath(filePath);
      const project = ProjectActions.getProjectState();

    if (!project.project?.project.path) {
      return;
    }

    const projectShortPath = await WindowsAPI.generateShortPath(
      project.project?.project.path
    );
    const pointCloudId = uuid();
    const outputPath = window.electronAPI.pathJoin(projectShortPath, "import", "pc", pointCloudId);
    const outputShortPath = await WindowsAPI.generateShortPath(outputPath);
    
    // Default parser kullan ([INFO]: message [PROGRESS]: 52.20 formatını parse eder)
    const result = await ShellCommandService.execute({
      command: await PathService.getPotreeConverterPath(),
      args: [shortPath, "-o", outputShortPath],
    });

    if (result.success) {
      // Read metadata.json from output path
      // PotreeConverter creates a folder with the point cloud name, so we need to find it
      // The structure is: outputPath/pointCloudName/metadata.json
      const fileName = filePath.substring(filePath.lastIndexOf('\\') + 1, filePath.lastIndexOf('.')) || 
                       filePath.substring(filePath.lastIndexOf('/') + 1, filePath.lastIndexOf('.')) || 
                       'pointcloud';
      
      const pointCloudFolderPath = window.electronAPI.pathJoin(outputShortPath);
      let metadataPath = window.electronAPI.pathJoin(pointCloudFolderPath, "metadata.json");
      
      try {
        // Try to read metadata.json from point cloud folder
        let metadataContent: string;
        try {
          metadataContent = await window.electronAPI.readProjectXML(metadataPath);
        } catch (error) {
          // If not found, try directly in output path
          metadataPath = window.electronAPI.pathJoin(outputShortPath, "metadata.json");
          metadataContent = await window.electronAPI.readProjectXML(metadataPath);
        }
        
        const metadata = JSON.parse(metadataContent);

        // Extract file extension from original file path
        const fileExtension = filePath.substring(filePath.lastIndexOf('.')) || '.laz';

        // Extract bounding box
        const bbox = metadata.boundingBox ? {
          min: {
            x: metadata.boundingBox.min[0],
            y: metadata.boundingBox.min[1],
            z: metadata.boundingBox.min[2],
          },
          max: {
            x: metadata.boundingBox.max[0],
            y: metadata.boundingBox.max[1],
            z: metadata.boundingBox.max[2],
          },
        } : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

        // Calculate center from bounding box
        const center = {
          x: (bbox.min.x + bbox.max.x) / 2,
          y: (bbox.min.y + bbox.max.y) / 2,
        };

        // Extract number of points
        const numberOfPoints = metadata.points || 0;

        const pointCloud: PointCloud = {
          id: pointCloudId,
          name: metadata.name || "Point Cloud",
          fileType: "pc",
          extension: fileExtension,
          asset: path.join(pointCloudFolderPath, "metadata.json"),
          bbox: bbox,
          center: center,
          epsg: metadata.projection || "4326",
          epsgText: metadata.projection || "WGS 84",
          proj4: metadata.projection || "+proj=longlat +datum=WGS84 +no_defs",
          path: path.join(pointCloudFolderPath, `${metadata.name}${fileExtension}`),
          import: true,
          numberOfPoints: numberOfPoints,
          dsm: { exist: false, file: "", res: 0 },
        };

        // Check if point cloud with same path already exists before adding
        const existingProject = ProjectActions.getProjectState();
        const existingPointClouds = existingProject.project?.metadata.pointCloud || [];
        const pathExists = existingPointClouds.some((pc) => {
          // Normalize paths for comparison
          const normalizedExistingPath = pc.path?.replace(/\\/g, '/').toLowerCase();
          const normalizedNewPath = pointCloud.path?.replace(/\\/g, '/').toLowerCase();
          return normalizedExistingPath === normalizedNewPath;
        });

        if (pathExists) {
          console.warn(`Point cloud with path ${pointCloud.path} already exists in project, skipping add`);
        } else {
          ProjectActions.addPointCloud(pointCloud);
          console.log("Point cloud added to project:", pointCloud);
        }
      } catch (error) {
        console.error("Error reading metadata.json:", error);
        // Fallback: create point cloud with minimal info
        const id = `pc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const fileExtension = filePath.substring(filePath.lastIndexOf('.')) || '.laz';
        const fallbackFileName = filePath.substring(filePath.lastIndexOf('\\') + 1, filePath.lastIndexOf('.')) || 
                                 filePath.substring(filePath.lastIndexOf('/') + 1, filePath.lastIndexOf('.')) || 
                                 'Point Cloud';
        
        const pointCloud: PointCloud = {
          id: id,
          name: fallbackFileName,
          fileType: "pc",
          extension: fileExtension,
          asset: id,
          bbox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
          center: { x: 0, y: 0 },
          epsg: "4326",
          epsgText: "WGS 84",
          proj4: "+proj=longlat +datum=WGS84 +no_defs",
          path: pointCloudFolderPath,
          import: true,
          numberOfPoints: 0,
          dsm: { exist: false, file: "", res: 0 },
        };

        // Check if point cloud with same path already exists before adding
        const existingProject = ProjectActions.getProjectState();
        const existingPointClouds = existingProject.project?.metadata.pointCloud || [];
        const pathExists = existingPointClouds.some((pc) => {
          const normalizedExistingPath = pc.path?.replace(/\\/g, '/').toLowerCase();
          const normalizedNewPath = pointCloud.path?.replace(/\\/g, '/').toLowerCase();
          return normalizedExistingPath === normalizedNewPath;
        });

        if (pathExists) {
          console.warn(`Point cloud with path ${pointCloud.path} already exists in project, skipping add`);
        } else {
          ProjectActions.addPointCloud(pointCloud);
        }
      }
    }

    console.log("Import result:", result);
    } finally {
      // Remove from importing set when done (success or failure)
      this.importingFiles.delete(filePath);
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

  static async mouseCoordListener(e: any, projects: any) {
    const coords: IntersectedObject = {
      point: {
        position: {
          x: -1,
          y: -1,
          z: -1,
        },
      },
    };
    const result = await PointCloudService.getMouseCoordinates(e, projects);

    if (result) {
      const point = result.point;
      coords.point.position.x = point.position.x;
      coords.point.position.y = point.position.y;
      coords.point.position.z = point.position.z;
    }

    return coords;
  }

  static async getMouseCoordinates(e: any, projects: any) {
    // Projects kontrolü - eğer projects null veya undefined ise null döndür
    if (!projects || !window.viewer || !window.viewer.scene) {
      return null;
    }

    // Canvas element'ini direkt kullanarak daha hassas koordinat hesaplama
    // Potree viewer'ın renderer'ındaki canvas'ı kullan
    const canvas = window.viewer.renderer?.domElement;
    if (!canvas) {
      // Fallback: potree_render_area kullan
      const renderArea = document.getElementById("potree_render_area");
      if (!renderArea) {
        return null;
      }
      const rect = renderArea.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return null;
      }
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Koordinatların render area içinde olup olmadığını kontrol et
      if (
        mouseX < 0 ||
        mouseY < 0 ||
        mouseX > rect.width ||
        mouseY > rect.height
      ) {
        return null;
      }

      try {
        const intersection =
          await window.Potree.Utils.getMousePointCloudIntersection(
            { x: mouseX, y: mouseY },
            window.viewer.scene.getActiveCamera(),
            window.viewer,
            projects
          );
        return intersection;
      } catch (error) {
        console.error("Error calculating mouse coordinates:", error);
        return null;
      }
    }

    // Canvas'ın bounding rect'ini al
    const rect = canvas.getBoundingClientRect();

    // rect geçerli mi kontrol et (width ve height 0'dan büyük olmalı)
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    // Daha hassas koordinat hesaplama
    // clientX/Y direkt mouse pozisyonunu verir (viewport koordinatları)
    // rect.left/top ise canvas'ın viewport'taki pozisyonunu verir
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Koordinatların canvas içinde olup olmadığını kontrol et
    // Küçük bir tolerance ekleyerek border'larda da çalışmasını sağla
    const tolerance = 1;
    if (
      mouseX < -tolerance ||
      mouseY < -tolerance ||
      mouseX > rect.width + tolerance ||
      mouseY > rect.height + tolerance
    ) {
      return null;
    }

    // Canvas'ın içindeki koordinatları clamp et
    const clampedX = Math.max(0, Math.min(rect.width, mouseX));
    const clampedY = Math.max(0, Math.min(rect.height, mouseY));

    try {
      const intersection =
        await window.Potree.Utils.getMousePointCloudIntersection(
          { x: clampedX, y: clampedY },
          window.viewer.scene.getActiveCamera(),
          window.viewer,
          projects
        );

      return intersection;
    } catch (error) {
      console.error("Error calculating mouse coordinates:", error);
      return null;
    }
  }
}

export default PointCloudService;
