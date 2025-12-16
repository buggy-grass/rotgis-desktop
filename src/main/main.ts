import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

// Potree için maksimum performans optimizasyonları
// GPU ve Hardware Acceleration ayarları
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,UseSkiaRenderer');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('enable-webgl2');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-compositor-resources');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');

// Windows'ta NVIDIA GPU'yu zorla - DirectX 11 kullan (NVIDIA için optimize)
if (process.platform === 'win32') {
  // DirectX 11 kullan (NVIDIA için en iyi performans)
  // Not: use-angle sadece bir kez kullanılabilir, son eklenen geçerli olur
  app.commandLine.appendSwitch('use-angle', 'd3d11');
  // Desktop OpenGL fallback (DirectX çalışmazsa)
  // app.commandLine.appendSwitch('use-gl', 'desktop');
  // GPU sandbox'ı kapat (NVIDIA için daha iyi performans)
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  // Chrome OS video decoder'ı kapat (Windows'ta gerekli değil)
  app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
  // Windows'ta DirectX 11 ve GPU seçimini optimize et
  app.commandLine.appendSwitch('enable-features', 'UseD3D11,DefaultANGLEOpenGL');
}

// Memory ve CPU optimizasyonları
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192'); // 8GB RAM limit
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Potree için WebGL ve rendering optimizasyonları
app.commandLine.appendSwitch('enable-webgl-draft-extensions');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

// V8 engine optimizasyonları
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

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
      // Potree için performans ayarları
      offscreen: false,
      // WebGL ve GPU optimizasyonları
      backgroundThrottling: false, // Arka planda throttle etme
      v8CacheOptions: 'code', // V8 cache optimizasyonu
    },
    backgroundColor: '#141414', // Dark background
    titleBarStyle: 'hidden',
    // Window performans ayarları
    show: false, // İlk render tamamlanana kadar gösterme
    transparent: false, // Transparency performansı düşürür
  });

  // Potree için performans optimizasyonları - WebContents ayarları
  const webContents = mainWindow.webContents;
  
  // GPU memory ve rendering optimizasyonları
  webContents.on('did-finish-load', () => {
    // WebGL context optimizasyonları
    webContents.executeJavaScript(`
      // GPU memory limit artırma
      if (navigator.gpu) {
        navigator.gpu.requestAdapter().then(adapter => {
          if (adapter) {
            console.log('GPU Adapter:', adapter.info || 'Available');
          }
        });
      }
      
      // WebGL performans optimizasyonları
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          console.log('GPU Renderer:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
          console.log('GPU Vendor:', gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        }
      }
    `).catch(console.error);
  });

  // Memory leak önleme - unused resources temizleme
  webContents.on('render-process-gone', (_event, details) => {
    console.error('Render process crashed:', details);
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  // Window hazır olduğunda göster (ilk render optimizasyonu)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // Focus optimizasyonu
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });

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

// App hazır olmadan önce performans ayarları
app.whenReady().then(() => {
  // GPU acceleration kontrolü
  const gpuStatus = app.getGPUFeatureStatus();
  console.log('GPU Feature Status:', gpuStatus);

  // Windows için ek optimizasyonlar (yukarıda zaten eklendi)
  // GPU seçimini kontrol et
  if (process.platform === 'win32') {
    // NVIDIA Optimus için (laptop'larda hem Intel hem NVIDIA varsa)
    // NVIDIA GPU'yu zorla
    process.env.DXGI_DEBUG_DEVICE = '1';
    // NVIDIA GPU'yu tercih et
    process.env.__GL_SYNC_TO_VBLANK = '0';
    process.env.__GL_THREADED_OPTIMIZATIONS = '1';
    process.env.__GL_YIELD = 'NOTHING';
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Memory leak önleme - app çıkışında temizlik
app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

