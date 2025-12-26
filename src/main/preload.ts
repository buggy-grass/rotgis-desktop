import { contextBridge, ipcRenderer } from 'electron';
import * as path from 'path';

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
  showFilePicker: (options: { 
    filters: Array<{ name: string; extensions: string[] }>;
    title?: string;
    defaultPath?: string;
  }) => {
    return ipcRenderer.invoke('show-file-picker', options);
  },
  getShortPath: (filePath: string) => {
    return ipcRenderer.invoke('get-short-path', filePath);
  },
  getAppPath: () => {
    return ipcRenderer.invoke('get-app-path');
  },
  executeCommand: (options: {
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
  }) => {
    return ipcRenderer.invoke('execute-command', options);
  },
  onCommandStdout: (callback: (line: string) => void) => {
    ipcRenderer.on('command-stdout', (_event, line: string) => callback(line));
  },
  onCommandStderr: (callback: (line: string) => void) => {
    ipcRenderer.on('command-stderr', (_event, line: string) => callback(line));
  },
  removeCommandListeners: () => {
    ipcRenderer.removeAllListeners('command-stdout');
    ipcRenderer.removeAllListeners('command-stderr');
  },
  directoryExists: (dirPath: string) => {
    return ipcRenderer.invoke('directory-exists', dirPath);
  },
  getFileSize: (filePath: string) => {
    return ipcRenderer.invoke('get-file-size', filePath);
  },
  copyFile: (sourcePath: string, destinationPath: string) => {
    return ipcRenderer.invoke('copy-file', sourcePath, destinationPath);
  },
  // Path utilities
  pathJoin: (...paths: string[]) => {
    return path.join(...paths);
  },
  pathDirname: (filePath: string) => {
    return path.dirname(filePath);
  },
});

