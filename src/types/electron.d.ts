export interface ElectronAPI {
  platform: string;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximize: (callback: (isMaximized: boolean) => void) => void;
  onWindowUnmaximize: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    viewer: any;
    Potree: any;
    pointSizeType: number;
    eventBus: any;
    THREE: any;
  }
}

