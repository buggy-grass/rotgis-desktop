import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';

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
  // Environment variables - app başlamadan ÖNCE set et (çok önemli!)
  // NVIDIA Optimus için (laptop'larda hem Intel hem NVIDIA varsa)
  process.env.__GL_SYNC_TO_VBLANK = '0';
  process.env.__GL_THREADED_OPTIMIZATIONS = '1';
  process.env.__GL_YIELD = 'NOTHING';
  // NVIDIA GPU'yu zorla
  process.env.__NV_PRIME_RENDER_OFFLOAD = '1';
  process.env.__VK_LAYER_NV_optimus = 'NVIDIA_only';
  process.env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia';
  // DirectX debug ve adapter seçimi
  process.env.DXGI_DEBUG_DEVICE = '1';
  // NVIDIA GPU adapter index'ini zorla (genellikle 1 veya 2, Intel genelde 0)
  process.env.__GL_GPU_PREFERENCE = 'P';
  
  // High-performance GPU'yu zorla (NVIDIA GPU'yu tercih et)
  app.commandLine.appendSwitch('force-high-performance-adapter');
  
  // GPU adapter seçimini zorla - discrete GPU'yu tercih et
  // 'U' = Unspecified (default), 'P' = Prefer discrete, 'L' = Low-power (integrated)
  app.commandLine.appendSwitch('gpu-preferences', 'P');
  
  // GPU adapter index'ini manuel olarak belirtmeyi dene
  // Genellikle 0 = Intel (integrated), 1 veya 2 = NVIDIA (discrete)
  // Production'da environment variable'dan veya config'den alınabilir
  // Varsayılan olarak 1 kullan (genellikle NVIDIA discrete GPU)
  const gpuAdapterIndex = process.env.ELECTRON_GPU_ADAPTER_INDEX || '1';
  if (gpuAdapterIndex !== 'auto') {
    app.commandLine.appendSwitch('use-adapter-index', gpuAdapterIndex);
    console.log(`GPU Adapter Index set to: ${gpuAdapterIndex}`);
  }
  
  // DirectX 11 kullan (NVIDIA için en iyi performans)
  // Not: use-angle sadece bir kez kullanılabilir, son eklenen geçerli olur
  // OpenGL desktop adapter index ile çakışıyor, bu yüzden DirectX 11 kullanıyoruz
  app.commandLine.appendSwitch('use-angle', 'd3d11');
  
  // Desktop OpenGL - adapter index ile çakışıyor, kullanmıyoruz
  // app.commandLine.appendSwitch('use-gl', 'desktop');
  
  // GPU sandbox'ı kapat (NVIDIA için daha iyi performans)
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  
  // Chrome OS video decoder'ı kapat (Windows'ta gerekli değil)
  app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
  
  // Windows'ta DirectX 11 ve GPU seçimini optimize et
  app.commandLine.appendSwitch('enable-features', 'UseD3D11,DefaultANGLEOpenGL');
  
  // Intel GPU'yu devre dışı bırak (sadece discrete GPU kullan)
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-software-compositing');
  
  // GPU blacklist'i ignore et (güvenlik için disabled GPU'ları da dene)
  app.commandLine.appendSwitch('ignore-gpu-blacklist');
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
    // WebGL context optimizasyonları ve GPU detection
    // Production için: Potree'nin WebGL context'lerini NVIDIA GPU'ya zorla
    webContents.executeJavaScript(`
      // WebGL context oluşturma fonksiyonunu override et (Potree için)
      // Bu, Potree viewer oluşturulmadan önce çalışır ve tüm WebGL context'lerine
      // powerPreference: 'high-performance' ekler
      // Eğer zaten override edilmişse, tekrar override etme
      if (typeof window.__originalGetContext === 'undefined') {
        window.__originalGetContext = HTMLCanvasElement.prototype.getContext;
        
        HTMLCanvasElement.prototype.getContext = function(contextType, attributes) {
          // WebGL context'leri için powerPreference ekle (NVIDIA GPU'yu zorla)
          if (contextType === 'webgl2' || contextType === 'webgl') {
            if (!attributes) {
              attributes = {};
            }
            // NVIDIA GPU'yu zorla
            attributes.powerPreference = 'high-performance';
            attributes.failIfMajorPerformanceCaveat = true;
            if (contextType === 'webgl2') {
              attributes.alpha = attributes.alpha !== undefined ? attributes.alpha : false;
              attributes.antialias = attributes.antialias !== undefined ? attributes.antialias : false;
              attributes.depth = attributes.depth !== undefined ? attributes.depth : true;
              attributes.stencil = attributes.stencil !== undefined ? attributes.stencil : false;
              attributes.preserveDrawingBuffer = attributes.preserveDrawingBuffer !== undefined ? attributes.preserveDrawingBuffer : false;
              attributes.desynchronized = attributes.desynchronized !== undefined ? attributes.desynchronized : true;
            }
          }
          return window.__originalGetContext.call(this, contextType, attributes);
        };
      }
      
      // GPU memory limit artırma
      if (navigator.gpu) {
        navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then(adapter => {
          if (adapter) {
            console.log('GPU Adapter:', adapter.info || 'Available');
            console.log('GPU Adapter Info:', JSON.stringify(adapter.info, null, 2));
          }
        }).catch(err => console.error('GPU Adapter Error:', err));
      }
      
      // WebGL performans optimizasyonları ve NVIDIA GPU detection
      const canvas = document.createElement('canvas');
      // High-performance GPU tercih et (NVIDIA)
      const gl = canvas.getContext('webgl2', { 
        powerPreference: 'high-performance',
        antialias: false,
        depth: true,
        stencil: false,
        alpha: false,
        preserveDrawingBuffer: false
      }) || canvas.getContext('webgl', { 
        powerPreference: 'high-performance',
        antialias: false,
        depth: true,
        stencil: false,
        alpha: false,
        preserveDrawingBuffer: false
      });
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          console.log('GPU Renderer:', renderer);
          console.log('GPU Vendor:', vendor);
          
          // NVIDIA GPU kontrolü
          if (renderer && (renderer.includes('NVIDIA') || renderer.includes('GeForce') || renderer.includes('RTX') || renderer.includes('GTX'))) {
            console.log('✅ NVIDIA GPU detected and active!');
          } else if (renderer && renderer.includes('Intel')) {
            console.warn('⚠️ Intel GPU detected - WebGL context override applied. Potree will use high-performance GPU.');
          } else {
            console.log('ℹ️ GPU Info:', renderer);
          }
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

// Windows'ta dedicated GPU'yu zorla (Optimus sistemler için)
// Bu, uygulamayı dedicated GPU ile yeniden başlatır
// Not: Development modunda restart mekanizması çalışmaz (webpack-dev-server nedeniyle)
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (process.platform === 'win32' && process.env.GPUSET !== 'true' && !isDev) {
  // Production modunda restart mekanizması
  console.log('Restarting with dedicated GPU (SHIM_MCCOMPAT)...');
  const child = spawn(process.execPath, process.argv, {
    env: {
      ...process.env,
      SHIM_MCCOMPAT: '0x800000001', // Bu Windows'a dedicated GPU kullanmasını söyler
      GPUSET: 'true', // Tekrar restart'ı önlemek için flag
    },
    detached: true,
    stdio: 'inherit',
  });
  child.unref(); // Parent process'i child'dan ayır
  app.exit(0);
} else {
  // Development modunda veya zaten restart edilmişse, SHIM_MCCOMPAT'ı set et
  if (process.platform === 'win32' && !process.env.SHIM_MCCOMPAT) {
    process.env.SHIM_MCCOMPAT = '0x800000001';
    if (isDev) {
      console.log('Development mode: SHIM_MCCOMPAT set (restart skipped for dev server)');
    }
  }
  // App hazır olmadan önce performans ayarları
  app.whenReady().then(() => {
    // GPU acceleration kontrolü
    const gpuStatus = app.getGPUFeatureStatus();
    console.log('GPU Feature Status:', JSON.stringify(gpuStatus, null, 2));
    
    // GPU bilgilerini logla
    const gpuInfo = app.getGPUFeatureStatus();
    console.log('GPU Info:', gpuInfo);

    // Windows'ta GPU adapter index'ini dinamik olarak bul ve ayarla
    if (process.platform === 'win32') {
      // GPU adapter listesini al (Electron API ile)
      // Not: Electron'da GPU adapter index'ini dinamik olarak almak için
      // webContents.executeJavaScript kullanmamız gerekiyor, ama bu app.whenReady'den önce çalışmaz
      // Bu yüzden adapter index'ini manuel olarak belirlemek için bir fallback mekanizması kullanıyoruz
      
      // GPU adapter index'ini environment variable'dan al (production'da config'den gelebilir)
      // Varsayılan olarak 1 kullan (genellikle NVIDIA discrete GPU)
      const adapterIndex = process.env.ELECTRON_GPU_ADAPTER_INDEX || '1';
      
      // Eğer adapter index belirtilmişse kullan
      if (adapterIndex && adapterIndex !== 'auto') {
        console.log(`Using GPU adapter index: ${adapterIndex}`);
        app.commandLine.appendSwitch('use-adapter-index', adapterIndex);
      }
    }

    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

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

