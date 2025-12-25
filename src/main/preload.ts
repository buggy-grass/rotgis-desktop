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
  
  // File system operations
  readDirectory: (dirPath: string) => {
    return ipcRenderer.invoke('read-directory', dirPath);
  },
  deleteFile: (filePath: string) => {
    return ipcRenderer.invoke('delete-file', filePath);
  },
  openInExplorer: (filePath: string) => {
    return ipcRenderer.invoke('open-in-explorer', filePath);
  },
  // Project XML operations
  readProjectXML: (filePath: string) => {
    return ipcRenderer.invoke('read-project-xml', filePath);
  },
  writeProjectXML: (filePath: string, content: string) => {
    return ipcRenderer.invoke('write-project-xml', filePath, content);
  },
  createProjectDirectory: (dirPath: string) => {
    return ipcRenderer.invoke('create-project-directory', dirPath);
  },
  showFolderPicker: (options?: { defaultPath?: string }) => {
    return ipcRenderer.invoke('show-folder-picker', options);
  },
  showProjectFilePicker: (options?: { defaultPath?: string }) => {
    return ipcRenderer.invoke('show-project-file-picker', options);
  },
  directoryExists: (dirPath: string) => {
    return ipcRenderer.invoke('directory-exists', dirPath);
  },
});

