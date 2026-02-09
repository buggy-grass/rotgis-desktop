export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

export interface ElectronAPI {
  platform: string;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximize: (callback: (isMaximized: boolean) => void) => void;
  onWindowUnmaximize: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
  readDirectory: (dirPath: string) => Promise<FileSystemItem[]>;
  deleteFile: (filePath: string) => Promise<boolean>;
  openInExplorer: (filePath: string) => Promise<void>;
  readProjectXML: (filePath: string) => Promise<string>;
  writeProjectXML: (filePath: string, content: string) => Promise<void>;
  createProjectDirectory: (dirPath: string) => Promise<string>;
  showFolderPicker: (options?: { defaultPath?: string }) => Promise<string | null>;
  showProjectFilePicker: (options?: { defaultPath?: string }) => Promise<string | null>;
  showFilePicker: (options: { 
    filters: Array<{ name: string; extensions: string[] }>;
    title?: string;
    defaultPath?: string;
  }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  getShortPath: (filePath: string) => Promise<string>;
  getAppPath: () => Promise<string>;
  executeCommand: (options: {
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    /** When true, returns { stdout, stderr } instead of streaming */
    captureOutput?: boolean;
  }) => Promise<
    | { success: boolean; exitCode: number; error?: string }
    | { success: boolean; exitCode: number; stdout: string; stderr: string }
  >;
  onCommandStdout: (callback: (line: string) => void) => void;
  onCommandStderr: (callback: (line: string) => void) => void;
  removeCommandListeners: () => void;
  directoryExists: (dirPath: string) => Promise<boolean>;
  getFileSize: (filePath: string) => Promise<number>;
  copyFile: (sourcePath: string, destinationPath: string) => Promise<void>;
  getRasterServerPort: () => Promise<number>;
  setRasterServerPath: (projectPath: string | null) => void;
  pathJoin: (...paths: string[]) => string;
  pathDirname: (filePath: string) => string;
  pathBasename: (filePath: string) => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    viewer: any;
    Potree: any;
    pointSizeType: number;
    eventBus: any;
    THREE: any;
    potreeReady?: boolean;
  }
}

