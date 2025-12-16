import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 500,
    minHeight: 400,
    frame: false, // Custom window bar için frame'i kaldır
    webPreferences: {
      nodeIntegration: true, // Webpack-dev-server için gerekli
      nodeIntegrationInWorker: true,
      contextIsolation: false, // Development modunda false (webpack-dev-server için)
      preload: isDev ? undefined : path.join(__dirname, 'preload.js'), // Development'ta preload kullanma
      devTools: isDev,
      webSecurity: false, // Development modunda
    },
    backgroundColor: '#141414', // Dark background
    titleBarStyle: 'hidden',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Window state değişikliklerini renderer'a bildir
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-unmaximized');
  });

  // Development modunda window kontrol fonksiyonlarını doğrudan expose et
  if (isDev) {
    const injectElectronAPI = () => {
      mainWindow?.webContents.executeJavaScript(`
        (function() {
          if (window.electronAPI) return; // Zaten varsa tekrar inject etme
          const { ipcRenderer } = require('electron');
          window.electronAPI = {
            platform: '${process.platform}',
            windowMinimize: () => ipcRenderer.send('window-minimize'),
            windowMaximize: () => ipcRenderer.send('window-maximize'),
            windowClose: () => ipcRenderer.send('window-close'),
            windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
            onWindowMaximize: (callback) => {
              ipcRenderer.on('window-maximized', (event, isMaximized) => {
                callback(isMaximized);
              });
            },
            onWindowUnmaximize: (callback) => {
              ipcRenderer.on('window-unmaximized', () => {
                callback();
              });
            },
            removeAllListeners: (channel) => {
              ipcRenderer.removeAllListeners(channel);
            }
          };
        })();
      `).catch(console.error);
    };

    // Her sayfa yüklemesinde inject et (hot reload için)
    mainWindow.webContents.on('did-finish-load', injectElectronAPI);
    mainWindow.webContents.on('dom-ready', injectElectronAPI);
  }
}

// Window kontrol IPC handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

