import {
  ProjectXML,
} from "../types/ProjectTypes";
import { parseProjectXML, serializeProjectXML } from "./XMLService";

/**
 * Default project template
 */
export function getDefaultProjectTemplate(): ProjectXML {
  const now = new Date();
  const projectId = generateUUID();
  const timestamp = now.getTime();

  return {
    project: {
      id: projectId,
      version: "1.0.0",
      name: "Untitled Project",
      path: "",
      created: formatDateTime(now),
      outcoordsys: {
        epsg: {
          code: 32636,
          proj: "+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs ",
        },
      },
    },
    metadata: {
      mesh: [
        {
          id: generateUUID(),
          name: "",
          fileType: "mesh",
          extension: "obj",
          asset: "textured_model_geo.mtl",
          bbox: createEmptyBBox(),
          center: { x: 0, y: 0 },
          epsg: "",
          epsgText: "",
          proj4: "",
          path: "",
          import: false,
        },
      ],
      pointCloud: [
        {
          id: generateUUID(),
          name: "",
          fileType: "pc",
          extension: "laz",
          asset: "metadata.json",
          bbox: createEmptyBBox(),
          center: { x: 0, y: 0 },
          epsg: "",
          epsgText: "",
          proj4: "",
          path: "",
          import: false,
          numberOfPoints: 0,
          dsm: {
            exist: false,
            file: "",
            res: 0,
          },
        },
      ],
      orthophoto: [
        {
          id: generateUUID(),
          name: "",
          fileType: "orthophoto",
          extension: "tif",
          asset: "odm_orthophoto.tif",
          cog: "orthophoto_cog.tif",
          center: { x: 0, y: 0 },
          epsg: "",
          epsgText: "",
          proj4: "",
          path: "",
          cogPath: "orthophoto_cog.tif",
          import: false,
        },
      ],
      dsm: [
        {
          id: generateUUID(),
          name: "",
          fileType: "orthophoto",
          extension: "tif",
          asset: "dsm.tif",
          cog: "dsm_cog.tif",
          center: { x: 0, y: 0 },
          epsg: "",
          epsgText: "",
          proj4: "",
          path: "",
          cogPath: "",
          import: false,
        },
      ],
      dtm: [
        {
          id: generateUUID(),
          name: "",
          fileType: "orthophoto",
          extension: "tif",
          asset: "dtm.tif",
          cog: "dtm_cog.tif",
          center: { x: 0, y: 0 },
          epsg: "",
          epsgText: "",
          proj4: "",
          path: "",
          cogPath: "dtm_cog.tif",
          import: false,
        },
      ],
    },
  };
}


/**
 * Save project to XML file
 * Creates project_name.rotg file and project_name folder
 */
export async function saveProject(
  project: ProjectXML,
  basePath: string
): Promise<{ projectFile: string; projectFolder: string }> {
  if (!window.electronAPI?.writeProjectXML || !window.electronAPI?.createProjectDirectory) {
    throw new Error("Electron API not available");
  }

  // Sanitize project name for file/folder names
  const sanitizedName = project.project.name
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
    .trim()
    .replace(/\s+/g, ' '); // Normalize whitespace

  // Create project folder path
  const projectFolder = pathJoin(basePath, sanitizedName);
  
  // Create project file path (project_name.rotg)
  const projectFile = pathJoin(basePath, `${sanitizedName}.rotg`);

  // Create project folder
  await window.electronAPI.createProjectDirectory(projectFolder);

  // Update project path and projectFile in the project object
  project.project.path = projectFolder;
  project.project.projectFile = projectFile;

  // Serialize and save XML file
  const xmlString = serializeProjectXML(project);
  await window.electronAPI.writeProjectXML(projectFile, xmlString);

  return { projectFile, projectFolder };
}

/**
 * Load project from XML file
 */
export async function loadProject(filePath: string): Promise<ProjectXML> {
  if (!window.electronAPI?.readProjectXML) {
    throw new Error("Electron API not available");
  }

  const xmlString = await window.electronAPI.readProjectXML(filePath);
  return parseProjectXML(xmlString);
}

// Helper functions

// Helper to join paths (simple implementation for browser environment)
// Handles both Windows and Unix paths
function pathJoin(...parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  
  // Check if first part is a Windows absolute path (e.g., "C:\" or "D:\")
  const isWindowsAbsolute = /^[A-Za-z]:[\\/]/.test(parts[0]);
  
  if (isWindowsAbsolute) {
    // Windows path handling
    let result = parts[0].replace(/[\\/]+$/, ''); // Remove trailing slashes
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');
      if (part) {
        result += '\\' + part;
      }
    }
    return result;
  } else {
    // Unix path handling
    return parts
      .map((part, i) => {
        if (i === 0) return part.replace(/\/$/, '');
        return part.replace(/^\//, '').replace(/\/$/, '');
      })
      .filter(part => part.length > 0)
      .join('/');
  }
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function createEmptyBBox() {
  return {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
  };
}


class ProjectService {
  /**
   * Create a new project with default template
   */
  static createNewProject(
    name: string = "Untitled Project",
    projectPath: string = ""
  ): ProjectXML {
    const project = getDefaultProjectTemplate();
    project.project.name = name;
    project.project.path = projectPath;
    project.project.id = generateUUID();
    project.project.created = formatDateTime(new Date());

    return project;
  }

  /**
   * Save project to file
   * Creates project_name.rotg file and project_name folder
   * @returns Object with projectFile and projectFolder paths
   */
  static async save(project: ProjectXML, basePath: string): Promise<{ projectFile: string; projectFolder: string }> {
    return saveProject(project, basePath);
  }

  /**
   * Load project from file
   */
  static async load(filePath: string): Promise<ProjectXML> {
    return loadProject(filePath);
  }

  /**
   * Save project to existing file path (for auto-save)
   */
  static async saveProjectToFile(
    project: ProjectXML,
    projectFilePath: string
  ): Promise<void> {
    if (!window.electronAPI?.writeProjectXML) {
      throw new Error("Electron API not available");
    }

    // Update projectFile path in the project object
    project.project.projectFile = projectFilePath;

    const xmlString = serializeProjectXML(project);
    await window.electronAPI.writeProjectXML(projectFilePath, xmlString);
  }

  /**
   * Get default template
   */
  static getDefaultTemplate(): ProjectXML {
    return getDefaultProjectTemplate();
  }
}

export default ProjectService;
