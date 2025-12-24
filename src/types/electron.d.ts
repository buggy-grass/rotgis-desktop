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

