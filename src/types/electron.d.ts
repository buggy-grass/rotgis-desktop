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
  deleteFile: (filePath: string) => Promise<void>;
  openInExplorer: (filePath: string) => Promise<void>;
  readProjectXML: (filePath: string) => Promise<string>;
  writeProjectXML: (filePath: string, content: string) => Promise<void>;
  createProjectDirectory: (dirPath: string) => Promise<void>;
  showFolderPicker: (options?: { defaultPath?: string }) => Promise<string | null>;
  showProjectFilePicker: (options?: { defaultPath?: string }) => Promise<string | null>;
  directoryExists: (dirPath: string) => Promise<boolean>;
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

