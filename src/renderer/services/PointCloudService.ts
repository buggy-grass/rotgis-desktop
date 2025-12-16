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
    const elem = document.getElementById("potree_container");
    const offset = elem?.getBoundingClientRect();
    const x_diff = offset?.left;
    const y_diff = offset?.top;

    if (x_diff && y_diff) {
      const intersection =
        await window.Potree.Utils.getMousePointCloudIntersection(
          { x: e.clientX - x_diff, y: e.clientY - y_diff },
          window.viewer.scene.getActiveCamera(),
          window.viewer,
          projects
        );

      return intersection;
    }

    return null;
  }
}

export default PointCloudService;
