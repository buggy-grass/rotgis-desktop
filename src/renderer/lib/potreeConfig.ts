/**
 * Potree Performance Configuration
 * 
 * Bu dosya Potree viewer için maksimum performans ayarlarını içerir.
 * RAM, GPU ve CPU optimizasyonları için yapılandırılmıştır.
 */

export interface PotreePerformanceConfig {
  // Point Budget - Render edilecek maksimum point sayısı
  pointBudget: number;
  
  // Quality Settings
  quality: 'low' | 'medium' | 'high' | 'ultra';
  
  // FOV (Field of View)
  fov: number;
  
  // EDL (Eye Dome Lighting) - Görsel kalite vs performans
  edlEnabled: boolean;
  
  // Material Settings
  material: {
    size: number;
    pointSizeType: number;
    shape: number;
    minSize: number;
    maxSize: number;
  };
  
  // Point Cloud Settings
  pointCloud: {
    pointSize: number;
    opacity: number;
    quality: string;
    elevationRange: [number, number];
  };
  
  // Rendering Optimizations
  rendering: {
    useWorker: boolean;
    maxWorkers: number;
    chunkSize: number;
    progressive: boolean;
  };
  
  // Memory Management
  memory: {
    maxCacheSize: number; // MB
    cleanupInterval: number; // ms
    enableGarbageCollection: boolean;
  };
  
  // GPU Optimizations
  gpu: {
    useInstancing: boolean;
    useFrustumCulling: boolean;
    useOcclusionCulling: boolean;
    maxTextureSize: number;
  };
}

/**
 * Sistem kaynaklarına göre otomatik performans profili seçer
 */
export function getOptimalConfig(): PotreePerformanceConfig {
  // GPU ve sistem bilgilerini kontrol et
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  // RAM bilgisi (navigator.deviceMemory - Chrome/Edge only)
  const deviceMemory = (navigator as any).deviceMemory || 4; // GB, default 4GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4; // CPU cores
  
  // GPU bilgisi
  let gpuTier = 'medium';
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // High-end GPU kontrolü
      if (renderer.includes('NVIDIA') || renderer.includes('RTX') || renderer.includes('GTX')) {
        gpuTier = 'high';
      } else if (renderer.includes('AMD') || renderer.includes('Radeon') || renderer.includes('RX')) {
        gpuTier = 'high';
      } else if (renderer.includes('Intel')) {
        gpuTier = 'medium';
      }
    }
    
    // Max texture size kontrolü
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize >= 16384) {
      gpuTier = 'high';
    }
  }
  
  // Sistem kaynaklarına göre point budget hesapla
  // Formula: RAM (GB) * CPU Cores * GPU Tier Multiplier * Base Budget
  const baseBudget = 1000000; // 1M points base
  const ramMultiplier = Math.min(deviceMemory / 4, 4); // Max 4x for 16GB+
  const cpuMultiplier = Math.min(hardwareConcurrency / 4, 2); // Max 2x for 8+ cores
  const gpuMultiplier = gpuTier === 'high' ? 2 : gpuTier === 'medium' ? 1.5 : 1;
  
  const pointBudget = Math.floor(baseBudget * ramMultiplier * cpuMultiplier * gpuMultiplier);
  
  // Quality seviyesi belirleme
  let quality: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
  if (deviceMemory >= 16 && hardwareConcurrency >= 8 && gpuTier === 'high') {
    quality = 'ultra';
  } else if (deviceMemory >= 8 && hardwareConcurrency >= 4) {
    quality = 'high';
  } else if (deviceMemory >= 4) {
    quality = 'medium';
  } else {
    quality = 'low';
  }
  
  return {
    pointBudget,
    quality,
    fov: 60,
    edlEnabled: quality !== 'low',
    material: {
      size: quality === 'ultra' ? 1.5 : quality === 'high' ? 1.2 : quality === 'medium' ? 1.0 : 0.8,
      pointSizeType: 1, // Fixed size
      shape: 1, // Circle
      minSize: 1,
      maxSize: quality === 'ultra' ? 10 : quality === 'high' ? 8 : 6,
    },
    pointCloud: {
      pointSize: quality === 'ultra' ? 2 : quality === 'high' ? 1.5 : 1,
      opacity: 1.0,
      quality: quality,
      elevationRange: [0, 1000],
    },
    rendering: {
      useWorker: true,
      maxWorkers: Math.min(hardwareConcurrency - 1, 4), // CPU cores - 1, max 4 workers
      chunkSize: quality === 'ultra' ? 50000 : quality === 'high' ? 30000 : 20000,
      progressive: true, // Progressive loading
    },
    memory: {
      maxCacheSize: Math.floor(deviceMemory * 100), // MB, RAM'in %10'u
      cleanupInterval: 30000, // 30 saniye
      enableGarbageCollection: true,
    },
    gpu: {
      useInstancing: true, // GPU instancing kullan
      useFrustumCulling: true, // Sadece görünen noktaları render et
      useOcclusionCulling: quality === 'high' || quality === 'ultra', // Yüksek kalitede occlusion culling
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096,
    },
  };
}

/**
 * Potree Viewer için performans ayarlarını uygular
 */
export function applyPotreeConfig(viewer: any, config: PotreePerformanceConfig): void {
  if (!viewer) {
    console.warn('Potree viewer not found');
    return;
  }
  
  try {
    // Point Budget
    if (viewer.setPointBudget) {
      viewer.setPointBudget(config.pointBudget);
    }
    
    // FOV
    if (viewer.setFOV) {
      viewer.setFOV(config.fov);
    }
    
    // EDL
    if (viewer.setEDLEnabled) {
      viewer.setEDLEnabled(config.edlEnabled);
    }
    
    // Quality
    if (viewer.setQuality) {
      viewer.setQuality(config.quality);
    }
    
    // Material settings - her point cloud için
    if (viewer.scene && viewer.scene.pointclouds) {
      viewer.scene.pointclouds.forEach((pointcloud: any) => {
        if (pointcloud.material) {
          const material = pointcloud.material;
          
          if (material.size !== undefined) {
            material.size = config.material.size;
          }
          if (material.pointSizeType !== undefined) {
            material.pointSizeType = config.material.pointSizeType;
          }
          if (material.shape !== undefined) {
            material.shape = config.material.shape;
          }
          if (material.minSize !== undefined) {
            material.minSize = config.material.minSize;
          }
          if (material.maxSize !== undefined) {
            material.maxSize = config.material.maxSize;
          }
        }
      });
    }
    
    // Rendering optimizations
    if (viewer.setProgressiveRendering !== undefined) {
      viewer.setProgressiveRendering(config.rendering.progressive);
    }
    
    console.log('Potree performance config applied:', {
      pointBudget: config.pointBudget,
      quality: config.quality,
      workers: config.rendering.maxWorkers,
    });
  } catch (error) {
    console.error('Error applying Potree config:', error);
  }
}

/**
 * Real-time performans monitoring ve dinamik ayarlama
 */
export function setupPerformanceMonitoring(
  viewer: any,
  config: PotreePerformanceConfig,
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void
): () => void {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;
  let frameTime = 16.67; // ms
  
  const monitor = () => {
    frameCount++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime;
    
    if (delta >= 1000) {
      fps = Math.round((frameCount * 1000) / delta);
      frameTime = delta / frameCount;
      frameCount = 0;
      lastTime = currentTime;
      
      const metrics: PerformanceMetrics = {
        fps,
        frameTime,
        pointCount: viewer.scene?.pointclouds?.reduce((sum: number, pc: any) => {
          return sum + (pc.visibleNodes?.reduce((s: number, n: any) => s + (n.getNumPoints?.() || 0), 0) || 0);
        }, 0) || 0,
        memoryUsage: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        } : undefined,
      };
      
      // FPS düşükse point budget'i azalt
      if (fps < 30 && config.pointBudget > 500000) {
        config.pointBudget = Math.floor(config.pointBudget * 0.9);
        if (viewer.setPointBudget) {
          viewer.setPointBudget(config.pointBudget);
        }
        console.log('Reduced point budget due to low FPS:', config.pointBudget);
      } else if (fps > 55 && config.pointBudget < 10000000) {
        // FPS yüksekse point budget'i artır
        config.pointBudget = Math.floor(config.pointBudget * 1.1);
        if (viewer.setPointBudget) {
          viewer.setPointBudget(config.pointBudget);
        }
        console.log('Increased point budget due to high FPS:', config.pointBudget);
      }
      
      if (onPerformanceUpdate) {
        onPerformanceUpdate(metrics);
      }
    }
    
    requestAnimationFrame(monitor);
  };
  
  const rafId = requestAnimationFrame(monitor);
  
  // Cleanup function
  return () => {
    cancelAnimationFrame(rafId);
  };
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  pointCount: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

/**
 * Memory cleanup - unused resources temizleme
 */
export function setupMemoryCleanup(
  viewer: any,
  config: PotreePerformanceConfig
): () => void {
  const cleanup = () => {
    if (!viewer || !viewer.scene) return;
    
    // Unused textures temizle
    if (viewer.scene.pointclouds) {
      viewer.scene.pointclouds.forEach((pointcloud: any) => {
        if (pointcloud.visibleNodes) {
          // Görünmeyen node'ları temizle
          pointcloud.visibleNodes = pointcloud.visibleNodes.filter((node: any) => {
            return node.visible !== false;
          });
        }
      });
    }
    
    // Force garbage collection (development only)
    if (config.memory.enableGarbageCollection && (window as any).gc) {
      (window as any).gc();
    }
  };
  
  const intervalId = setInterval(cleanup, config.memory.cleanupInterval);
  
  return () => {
    clearInterval(intervalId);
  };
}

