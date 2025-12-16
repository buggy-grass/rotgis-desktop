import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // Window kontrol fonksiyonları
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Window state değişikliklerini dinle
  onWindowMaximize: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => {
      callback(isMaximized);
    };
    ipcRenderer.on('window-maximized', handler);
    // Cleanup için handler'ı sakla (isteğe bağlı)
  },
  
  onWindowUnmaximize: (callback: () => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on('window-unmaximized', handler);
  },
  
  // Listener'ları temizle
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

