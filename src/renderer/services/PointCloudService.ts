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
      if (mouseX < 0 || mouseY < 0 || mouseX > rect.width || mouseY > rect.height) {
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
    if (mouseX < -tolerance || mouseY < -tolerance || 
        mouseX > rect.width + tolerance || mouseY > rect.height + tolerance) {
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
