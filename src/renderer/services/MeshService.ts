import path from "path";
import ProjectActions from "../store/actions/ProjectActions";
import { Mesh } from "../types/ProjectTypes";
import PathService from "./PathService";
import WindowsAPI from "./WindowsAPI";
import { v4 as uuid } from "uuid";

interface IntersectedObject {
  id: string;
  point: {
    position: {
      x: number;
      y: number;
      z: number;
    };
  };
}

interface Mouse {
  x: number;
  y: number;
}

class MeshService {
  private static importingFiles = new Set<string>(); // Track currently importing files

  static async import(filePath: string) {
    // Prevent duplicate imports of the same file
    if (this.importingFiles.has(filePath)) {
      console.warn(
        `File ${filePath} is already being imported, skipping duplicate import`
      );
      return;
    }

    this.importingFiles.add(filePath);

    try {
      const fileName =
        filePath.substring(
          filePath.lastIndexOf("\\") + 1,
          filePath.lastIndexOf(".")
        ) ||
        filePath.substring(
          filePath.lastIndexOf("/") + 1,
          filePath.lastIndexOf(".")
        ) ||
        "mesh";

      const project = ProjectActions.getProjectState();

      if (!project.project?.project.path) {
        return;
      }

      const projectShortPath = await WindowsAPI.generateShortPath(
        project.project?.project.path
      );
      const meshId = uuid();

      // Create import/mesh/{meshId} directory structure
      const meshFolderPath = window.electronAPI.pathJoin(
        projectShortPath,
        "import",
        "mesh",
        meshId
      );

      const createMeshDirectory =
        await window.electronAPI.createProjectDirectory(meshFolderPath);

      const fileExtension =
        filePath.substring(filePath.lastIndexOf(".")) || ".obj";
      const destinationPath = window.electronAPI.pathJoin(
        createMeshDirectory,
        `${fileName}${fileExtension}`
      );

      try {
        // Copy the mesh file to project directory
        await window.electronAPI.copyFile(filePath, destinationPath);
        console.log(`Successfully copied mesh file to ${destinationPath}`);

        // Also copy associated .mtl file if it exists
        const mtlFilePath =
          filePath.substring(0, filePath.lastIndexOf(".")) + ".mtl";
        try {
          const mtlDestinationPath = window.electronAPI.pathJoin(
            createMeshDirectory,
            `${fileName}.mtl`
          );
          await window.electronAPI.copyFile(mtlFilePath, mtlDestinationPath);
          console.log(`Successfully copied MTL file to ${mtlDestinationPath}`);
        } catch (error) {
          // MTL file is optional, so we don't fail if it doesn't exist
          console.log(
            `MTL file not found or couldn't be copied: ${mtlFilePath}`
          );
        }

        // Copy texture files (png, jpg, jpeg, bmp) from the same directory as OBJ file
        try {
          const sourceDir = window.electronAPI.pathDirname(filePath);
          const directoryItems = await window.electronAPI.readDirectory(
            sourceDir
          );

          const textureExtensions = [".png", ".jpg", ".jpeg", ".bmp"];
          for (const item of directoryItems) {
            if (item.type === "file") {
              const ext = item.name
                .substring(item.name.lastIndexOf("."))
                .toLowerCase();
              if (textureExtensions.includes(ext)) {
                const sourceTexturePath = window.electronAPI.pathJoin(
                  sourceDir,
                  item.name
                );
                const destTexturePath = window.electronAPI.pathJoin(
                  createMeshDirectory,
                  item.name
                );
                try {
                  await window.electronAPI.copyFile(
                    sourceTexturePath,
                    destTexturePath
                  );
                  console.log(`Successfully copied texture file: ${item.name}`);
                } catch (error) {
                  console.warn(
                    `Could not copy texture file ${item.name}:`,
                    error
                  );
                }
              }
            }
          }
        } catch (error) {
          // Texture files are optional, so we don't fail if directory read fails
          console.log(`Could not read directory for texture files:`, error);
        }

        // Extract bounding box and center (default values for now)
        // In a real implementation, you might want to parse the OBJ file to calculate these
        const bbox = {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
        };

        const center = {
          x: 0,
          y: 0,
        };

        const mesh: Mesh = {
          id: meshId,
          name: window.electronAPI.pathBasename(filePath) || "Mesh",
          fileType: "mesh",
          extension: fileExtension,
          asset: window.electronAPI.pathJoin(
            "import",
            "mesh",
            meshId,
            `${fileName}.mtl`
          ), // MTL file path for material
          bbox: bbox,
          center: center,
          epsg: "4326", // Default EPSG
          epsgText: "WGS 84",
          proj4: "+proj=longlat +datum=WGS84 +no_defs",
          path: window.electronAPI.pathJoin(
            "import",
            "mesh",
            meshId,
            `${fileName}${fileExtension}`
          ),
          import: true,
        };

        // Check if mesh with same path already exists before adding
        const existingProject = ProjectActions.getProjectState();
        const existingMeshes = existingProject.project?.metadata.mesh || [];
        const pathExists = existingMeshes.some((m) => {
          // Normalize paths for comparison
          const normalizedExistingPath = m.path
            ?.replace(/\\/g, "/")
            .toLowerCase();
          const normalizedNewPath = mesh.path
            ?.replace(/\\/g, "/")
            .toLowerCase();
          return normalizedExistingPath === normalizedNewPath;
        });

        if (pathExists) {
          console.warn(
            `Mesh with path ${mesh.path} already exists in project, skipping add`
          );
        } else {
          ProjectActions.addMesh(mesh);
          console.log("Mesh added to project:", mesh);
        }
      } catch (error) {
        console.error("Error copying mesh file:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error importing mesh:", error);
    } finally {
      // Remove from importing set when done (success or failure)
      this.importingFiles.delete(filePath);
    }
  }

  static async mouseCoordListener(e: any) {
    const coords: IntersectedObject = {
      id: "",
      point: {
        position: {
          x: -1,
          y: -1,
          z: -1,
        },
      },
    };
    const result = await MeshService.getMouseCoordinates(e);

    if (result) {
      const point = result.point;
      coords.id = result.id;
      coords.point.position.x = point.position.x;
      coords.point.position.y = point.position.y;
      coords.point.position.z = point.position.z;
    }

    return coords;
  }

  static async getMouseCoordinates(e: any) {
    // Projects kontrolü - eğer viewer yoksa null döndür
    if (!window.viewer || !window.viewer.scene) {
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
        const meshIntersect = await MeshService.meshIntersection({
          x: mouseX,
          y: mouseY,
        });
        return meshIntersect;
      } catch (error) {
        console.error("Error calculating mesh mouse coordinates:", error);
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
      const meshIntersect = await MeshService.meshIntersection({
        x: clampedX,
        y: clampedY,
      });

      return meshIntersect;
    } catch (error) {
      console.error("Error calculating mesh mouse coordinates:", error);
      return null;
    }
  }

  static async meshIntersection(e: any) {
    if (!window.viewer || !window.viewer.scene || !window.viewer.scene.scene) {
      return null;
    }

    const raycaster = new window.THREE.Raycaster();
    const rendererElement = window.viewer.renderer.domElement;
    
    // Optimize: calculate mouse coordinates only once
    const mouse: Mouse = {
      x: (e.x / rendererElement.clientWidth) * 2 - 1,
      y: -(e.y / rendererElement.clientHeight) * 2 + 1,
    };

    const camera = window.viewer.scene.getActiveCamera();
    if (!camera) {
      return null;
    }

    raycaster.setFromCamera(mouse, camera);

    // Optimize: collect mesh objects more efficiently
    const meshObjects: any[] = [];
    const objects = window.viewer.scene.scene.children;

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i] as any;
      // Check for modelType (our project) or droType (Dronet compatibility)
      if (obj.modelType === "mesh") {
        // Collect children if available, otherwise the object itself
        if (obj.children && obj.children.length > 0) {
          meshObjects.push(...obj.children);
        } else {
          meshObjects.push(obj);
        }
      }
    }

    if (meshObjects.length === 0) {
      return null;
    }

    // Perform intersection with recursive flag for nested children
    const intersects = raycaster.intersectObjects(meshObjects, true);

    if (intersects.length === 0) {
      return null;
    }

    // Get closest intersection (already sorted by distance)
    const intersected = intersects[0];

    return {
      id: intersected.object.name,
      point: {
        position: {
          x: intersected.point.x,
          y: intersected.point.y,
          z: intersected.point.z,
        },
      },
    } as IntersectedObject;
  }
}

export default MeshService;
