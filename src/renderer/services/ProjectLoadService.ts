import { parseProjectXML } from "./XMLService";
import { ProjectXML } from "../types/ProjectTypes";
import ProjectActions from "../store/actions/ProjectActions";

/**
 * Helper to join paths (simple implementation for browser environment)
 * Handles both Windows and Unix paths
 */
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

/**
 * Get directory name from file path
 */
function getDirectoryName(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'));
  if (lastSlash === -1) return '';
  return filePath.substring(0, lastSlash);
}

/**
 * Get file name without extension from file path
 */
function getFileNameWithoutExtension(filePath: string): string {
  const fileName = filePath.substring(Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/')) + 1);
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return fileName;
  return fileName.substring(0, lastDot);
}

/**
 * Validate and load project from .rotg file
 * Performs all necessary checks before loading
 */
export async function loadProjectFromFile(filePath: string): Promise<{
  project: ProjectXML;
  projectFilePath: string;
  projectFolderPath: string;
}> {
  if (!window.electronAPI?.readProjectXML || !window.electronAPI?.directoryExists) {
    throw new Error("Electron API not available");
  }

  // Step 1: Read file content
  let xmlString: string;
  try {
    xmlString = await window.electronAPI.readProjectXML(filePath);
  } catch (error) {
    throw new Error(`Failed to read project file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Step 2: Check if file is empty
  if (!xmlString || xmlString.trim().length === 0) {
    throw new Error("Project file is empty or corrupted");
  }

  // Step 3: Check if content starts with <rotgis> or has XML declaration followed by <rotgis>
  const trimmedContent = xmlString.trim();
  let hasRotgisTag = false;
  
  if (trimmedContent.startsWith('<rotgis>')) {
    hasRotgisTag = true;
  } else if (trimmedContent.startsWith('<?xml')) {
    // Check if <rotgis> exists after XML declaration
    const rotgisIndex = trimmedContent.indexOf('<rotgis>');
    if (rotgisIndex === -1) {
      throw new Error("Invalid project file format. File must contain <rotgis> tag.");
    }
    hasRotgisTag = true;
  } else {
    // Check if <rotgis> exists anywhere
    if (trimmedContent.includes('<rotgis>')) {
      const rotgisIndex = trimmedContent.indexOf('<rotgis>');
      // Check if there's only whitespace before <rotgis>
      const beforeRotgis = trimmedContent.substring(0, rotgisIndex).trim();
      if (beforeRotgis.length > 0 && !beforeRotgis.startsWith('<?xml')) {
        throw new Error("Invalid project file format. File must start with <rotgis> tag or XML declaration followed by <rotgis>.");
      }
      hasRotgisTag = true;
    } else {
      throw new Error("Invalid project file format. File must contain <rotgis> tag.");
    }
  }

  if (!hasRotgisTag) {
    throw new Error("Invalid project file format. File must contain <rotgis> tag.");
  }

  // Step 4: Validate XML structure by parsing
  let project: ProjectXML;
  try {
    project = parseProjectXML(xmlString);
  } catch (error) {
    throw new Error(`Project file is corrupted or invalid: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Step 5: Get project folder path
  const fileDirectory = getDirectoryName(filePath);
  const projectFileName = getFileNameWithoutExtension(filePath);
  const expectedProjectFolder = pathJoin(fileDirectory, projectFileName);

  // Step 6: Check if project folder exists
  const folderExists = await window.electronAPI.directoryExists(expectedProjectFolder);
  if (!folderExists) {
    throw new Error(`Project folder not found: "${expectedProjectFolder}". The project folder must exist next to the .rotg file.`);
  }

  // Step 7: Validate project structure
  if (!project.project) {
    throw new Error("Invalid project structure: missing project data");
  }

  if (!project.project.name) {
    throw new Error("Invalid project structure: missing project name");
  }

  // Step 8: Update project path in the loaded project
  project.project.path = expectedProjectFolder;

  return {
    project,
    projectFilePath: filePath,
    projectFolderPath: expectedProjectFolder,
  };
}

/**
 * Open project file picker and load project
 */
export async function openProject(): Promise<void> {
  if (!window.electronAPI?.showProjectFilePicker) {
    throw new Error("Electron API not available");
  }

  try {
    // Show file picker
    const selectedFilePath = await window.electronAPI.showProjectFilePicker();
    
    if (!selectedFilePath) {
      // User cancelled
      return;
    }

    // Load and validate project
    const { project, projectFilePath, projectFolderPath } = await loadProjectFromFile(selectedFilePath);

    // Update store
    ProjectActions.setProject(project);
    ProjectActions.setProjectPaths(projectFilePath, projectFolderPath);
    ProjectActions.setDirty(false);

    console.log("Project loaded successfully:", projectFilePath);
  } catch (error) {
    console.error("Error opening project:", error);
    throw error;
  }
}

