import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

const execAsync = promisify(exec);

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
  app.commandLine.appendSwitch("force_high_performance_gpu");
  app.commandLine.appendSwitch("disable-frame-rate-limit");
  app.commandLine.appendSwitch("disable-gpu-vsync");
  app.commandLine.appendSwitch("disable-features", "VsyncProvider");
  
  // Desktop OpenGL - adapter index ile çakışıyor, kullanmıyoruz
  // app.commandLine.appendSwitch('use-gl', 'desktop');
  
  // GPU sandbox'ı kapat (NVIDIA için daha iyi performans)
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  
  // Chrome OS video decoder'ı kapat (Windows'ta gerekli değil)
  // app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
  
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
          if (window.electronAPI) {
            // Zaten varsa eksik fonksiyonları kontrol et ve ekle
            const { ipcRenderer } = require('electron');
            if (!window.electronAPI.readDirectory) {
              window.electronAPI.readDirectory = (dirPath) => {
                return ipcRenderer.invoke('read-directory', dirPath);
              };
            }
            if (!window.electronAPI.deleteFile) {
              window.electronAPI.deleteFile = (filePath) => {
                return ipcRenderer.invoke('delete-file', filePath);
              };
            }
            if (!window.electronAPI.openInExplorer) {
              window.electronAPI.openInExplorer = (filePath) => {
                return ipcRenderer.invoke('open-in-explorer', filePath);
              };
            }
            if (!window.electronAPI.readProjectXML) {
              window.electronAPI.readProjectXML = (filePath) => {
                return ipcRenderer.invoke('read-project-xml', filePath);
              };
            }
            if (!window.electronAPI.writeProjectXML) {
              window.electronAPI.writeProjectXML = (filePath, content) => {
                return ipcRenderer.invoke('write-project-xml', filePath, content);
              };
            }
            if (!window.electronAPI.createProjectDirectory) {
              window.electronAPI.createProjectDirectory = (dirPath) => {
                return ipcRenderer.invoke('create-project-directory', dirPath);
              };
            }
            if (!window.electronAPI.showFolderPicker) {
              window.electronAPI.showFolderPicker = (options) => {
                return ipcRenderer.invoke('show-folder-picker', options);
              };
            }
            if (!window.electronAPI.showProjectFilePicker) {
              window.electronAPI.showProjectFilePicker = (options) => {
                return ipcRenderer.invoke('show-project-file-picker', options);
              };
            }
            if (!window.electronAPI.directoryExists) {
              window.electronAPI.directoryExists = (dirPath) => {
                return ipcRenderer.invoke('directory-exists', dirPath);
              };
            }
            if (!window.electronAPI.showFilePicker) {
              window.electronAPI.showFilePicker = (options) => {
                return ipcRenderer.invoke('show-file-picker', options);
              };
            }
            if (!window.electronAPI.getShortPath) {
              window.electronAPI.getShortPath = (filePath) => {
                return ipcRenderer.invoke('get-short-path', filePath);
              };
            }
            if (!window.electronAPI.executeCommand) {
              window.electronAPI.executeCommand = (options) => {
                return ipcRenderer.invoke('execute-command', options);
              };
            }
            if (!window.electronAPI.onCommandStdout) {
              window.electronAPI.onCommandStdout = (callback) => {
                ipcRenderer.on('command-stdout', (event, line) => callback(line));
              };
            }
            if (!window.electronAPI.onCommandStderr) {
              window.electronAPI.onCommandStderr = (callback) => {
                ipcRenderer.on('command-stderr', (event, line) => callback(line));
              };
            }
            if (!window.electronAPI.removeCommandListeners) {
              window.electronAPI.removeCommandListeners = () => {
                ipcRenderer.removeAllListeners('command-stdout');
                ipcRenderer.removeAllListeners('command-stderr');
              };
            }
            return;
          }
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
            },
            readDirectory: (dirPath) => {
              return ipcRenderer.invoke('read-directory', dirPath);
            },
            deleteFile: (filePath) => {
              return ipcRenderer.invoke('delete-file', filePath);
            },
            openInExplorer: (filePath) => {
              return ipcRenderer.invoke('open-in-explorer', filePath);
            },
            readProjectXML: (filePath) => {
              return ipcRenderer.invoke('read-project-xml', filePath);
            },
            writeProjectXML: (filePath, content) => {
              return ipcRenderer.invoke('write-project-xml', filePath, content);
            },
            createProjectDirectory: (dirPath) => {
              return ipcRenderer.invoke('create-project-directory', dirPath);
            },
            showFolderPicker: (options) => {
              return ipcRenderer.invoke('show-folder-picker', options);
            },
            showProjectFilePicker: (options) => {
              return ipcRenderer.invoke('show-project-file-picker', options);
            },
            directoryExists: (dirPath) => {
              return ipcRenderer.invoke('directory-exists', dirPath);
            },
            showFilePicker: (options) => {
              return ipcRenderer.invoke('show-file-picker', options);
            },
            getShortPath: (filePath) => {
              return ipcRenderer.invoke('get-short-path', filePath);
            },
            getAppPath: () => {
              return ipcRenderer.invoke('get-app-path');
            },
            pathJoin: (...paths) => {
              const path = require('path');
              return path.join(...paths);
            },
            executeCommand: (options) => {
              return ipcRenderer.invoke('execute-command', options);
            },
            onCommandStdout: (callback) => {
              ipcRenderer.on('command-stdout', (event, line) => callback(line));
            },
            onCommandStderr: (callback) => {
              ipcRenderer.on('command-stderr', (event, line) => callback(line));
            },
            removeCommandListeners: () => {
              ipcRenderer.removeAllListeners('command-stdout');
              ipcRenderer.removeAllListeners('command-stderr');
            }
          };
          console.log('ElectronAPI injected with all functions');
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

// File system IPC handlers
interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

async function readDirectory(dirPath: string): Promise<FileSystemItem[]> {
  try {
    const items: FileSystemItem[] = [];
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const item: FileSystemItem = {
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      };

      if (entry.isDirectory()) {
        try {
          item.children = await readDirectory(fullPath);
        } catch (error) {
          // Permission denied veya diğer hatalar için boş children
          item.children = [];
        }
      }

      items.push(item);
    }

    return items.sort((a, b) => {
      // Önce klasörler, sonra dosyalar
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    throw error;
  }
}

ipcMain.handle('read-directory', async (_event, dirPath: string): Promise<FileSystemItem[]> => {
  try {
    // Güvenlik kontrolü - path'in geçerli olduğundan emin ol
    const normalizedPath = path.normalize(dirPath);
    const stats = await fsPromises.stat(normalizedPath);
    
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    return await readDirectory(normalizedPath);
  } catch (error) {
    console.error('Error in read-directory handler:', error);
    throw error;
  }
});

// Delete file or directory
ipcMain.handle('delete-file', async (_event, filePath: string): Promise<void> => {
  try {
    const normalizedPath = path.normalize(filePath);
    const stats = await fsPromises.stat(normalizedPath);
    
    if (stats.isDirectory()) {
      await fsPromises.rm(normalizedPath, { recursive: true, force: true });
    } else {
      await fsPromises.unlink(normalizedPath);
    }
  } catch (error) {
    console.error('Error in delete-file handler:', error);
    throw error;
  }
});

// Open file/folder in system explorer
ipcMain.handle('open-in-explorer', async (_event, filePath: string): Promise<void> => {
  try {
    const normalizedPath = path.normalize(filePath);
    const { shell } = require('electron');
    
    if (process.platform === 'win32') {
      // Windows: Show in Explorer
      shell.showItemInFolder(normalizedPath);
    } else if (process.platform === 'darwin') {
      // macOS: Reveal in Finder
      shell.showItemInFolder(normalizedPath);
    } else {
      // Linux: Open in file manager
      shell.showItemInFolder(normalizedPath);
    }
  } catch (error) {
    console.error('Error in open-in-explorer handler:', error);
    throw error;
  }
});

// Read XML project file
ipcMain.handle('read-project-xml', async (_event, filePath: string): Promise<string> => {
  try {
    const normalizedPath = path.normalize(filePath);
    const content = await fsPromises.readFile(normalizedPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error in read-project-xml handler:', error);
    throw error;
  }
});

// Write XML project file
ipcMain.handle('write-project-xml', async (_event, filePath: string, content: string): Promise<void> => {
  try {
    const normalizedPath = path.normalize(filePath);
    const dir = path.dirname(normalizedPath);
    
    // Only create directory if it's not a root directory (e.g., "C:\", "D:\")
    // Root directories cannot be created and don't need to be created
    const isRootDir = /^[A-Za-z]:[\\/]?$/.test(dir);
    if (!isRootDir) {
      // Create directory if it doesn't exist
      await fsPromises.mkdir(dir, { recursive: true });
    }
    
    await fsPromises.writeFile(normalizedPath, content, 'utf-8');
  } catch (error) {
    console.error('Error in write-project-xml handler:', error);
    throw error;
  }
});

// Create project directory
ipcMain.handle('create-project-directory', async (_event, dirPath: string): Promise<void> => {
  try {
    const normalizedPath = path.normalize(dirPath);
    await fsPromises.mkdir(normalizedPath, { recursive: true });
  } catch (error) {
    console.error('Error in create-project-directory handler:', error);
    throw error;
  }
});

// Show folder picker dialog
ipcMain.handle('show-folder-picker', async (_event, options?: { defaultPath?: string }): Promise<string | null> => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      defaultPath: options?.defaultPath,
      title: 'Select Project Save Location',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    console.error('Error in show-folder-picker handler:', error);
    throw error;
  }
});

// Show file picker dialog for .rotg files
ipcMain.handle('show-project-file-picker', async (_event, options?: { defaultPath?: string }): Promise<string | null> => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'RotGIS Project Files', extensions: ['rotg'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      defaultPath: options?.defaultPath,
      title: 'Open Project',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    console.error('Error in show-project-file-picker handler:', error);
    throw error;
  }
});

// Show file picker dialog with custom filters
ipcMain.handle('show-file-picker', async (_event, options: { 
  filters: Array<{ name: string; extensions: string[] }>;
  title?: string;
  defaultPath?: string;
}): Promise<{ canceled: boolean; filePaths: string[] }> => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options.filters,
      defaultPath: options.defaultPath,
      title: options.title || 'Select File',
    });

    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  } catch (error) {
    console.error('Error in show-file-picker handler:', error);
    throw error;
  }
});

// Get Windows short path (8.3 format) for paths with special characters
ipcMain.handle('get-short-path', async (_event, filePath: string): Promise<string> => {
  try {
    // Only works on Windows
    if (process.platform !== 'win32') {
      // On non-Windows platforms, return the original path
      return filePath;
    }

    // Check if path exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Path does not exist: ${filePath}`);
    }

    // Use Windows cmd to get short path
    // cmd /c for %I in ("path") do @echo %~sI
    // We need to escape the path properly for cmd
    const escapedPath = filePath.replace(/"/g, '""'); // Escape double quotes
    const command = `cmd /c for %I in ("${escapedPath}") do @echo %~sI`;
    
    const { stdout, stderr } = await execAsync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr && stderr.trim()) {
      console.warn('Warning from get-short-path:', stderr);
    }

    const shortPath = stdout.trim();
    
    // If short path is empty or same as original, return original
    if (!shortPath || shortPath === filePath) {
      return filePath;
    }

    return shortPath;
  } catch (error) {
    console.error('Error in get-short-path handler:', error);
    // If getting short path fails, return the original path
    return filePath;
  }
});

// Get application path (works in both development and production)
ipcMain.handle('get-app-path', async (): Promise<string> => {
  try {
    if (app.isPackaged) {
      // Production: app.asar içinde
      // app.getAppPath() returns path to app.asar or app directory
      return app.getAppPath().replace(/[\\/]app\.asar$/, '');
    } else {
      // Development: process.cwd() returns project root
      return process.cwd();
    }
  } catch (error) {
    console.error('Error getting app path:', error);
    // Fallback to process.cwd()
    return process.cwd();
  }
});

// Execute shell command and stream stdout/stderr
ipcMain.handle('execute-command', async (_event, options: {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}): Promise<{ success: boolean; exitCode: number; error?: string }> => {
  return new Promise((resolve) => {
    try {
      const { command, args = [], cwd, env } = options;
      
      const childProcess = spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...env },
        shell: process.platform === 'win32', // Windows'ta shell kullan
      });

      let stdoutData = '';
      let stderrData = '';

      // stdout stream
      childProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        stdoutData += text;
        // Her satırı renderer'a gönder
        const lines = text.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          if (mainWindow) {
            mainWindow.webContents.send('command-stdout', line);
          }
        });
      });

      // stderr stream
      childProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        stderrData += text;
        // Her satırı renderer'a gönder
        const lines = text.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          if (mainWindow) {
            mainWindow.webContents.send('command-stderr', line);
          }
        });
      });

      childProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code || 0,
          error: stderrData || undefined,
        });
      });

      childProcess.on('error', (error) => {
        resolve({
          success: false,
          exitCode: -1,
          error: error.message,
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        exitCode: -1,
        error: error?.message || 'Unknown error',
      });
    }
  });
});

// Check if directory exists
ipcMain.handle('directory-exists', async (_event, dirPath: string): Promise<boolean> => {
  try {
    const normalizedPath = path.normalize(dirPath);
    const stats = await fsPromises.stat(normalizedPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
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

