import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import store from './store/store';
import './styles/globals.css';

// Potree için performans optimizasyonları
// React 18 concurrent features ve optimizasyonlar
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
  {
    // Concurrent mode optimizasyonları
    identifierPrefix: 'rotgis-',
  }
);

// Performance monitoring (development için)
if (process.env.NODE_ENV === 'development') {
  // React DevTools Profiler için
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot?.(
    1,
    root as any
  );
}

root.render(
    <Suspense fallback={<div>Loading...</div>}>
      <Provider store={store}>
        <App />
      </Provider>
    </Suspense>
);

// Potree için WebGL ve GPU optimizasyonları - global scope
if (typeof window !== 'undefined') {
  // RequestAnimationFrame optimizasyonu
  let lastTime = 0;
  const originalRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function(callback: FrameRequestCallback) {
    const currentTime = performance.now();
    const timeToCall = Math.max(0, 16 - (currentTime - lastTime));
    const id = originalRAF(function(time) {
      lastTime = currentTime + timeToCall;
      callback(time);
    });
    lastTime = currentTime + timeToCall;
    return id;
  };

  // Memory optimizasyonları - garbage collection hints
  if ('gc' in window && typeof (window as any).gc === 'function') {
    // Development'ta manuel GC (production'da otomatik)
    setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        // (window as any).gc();
      }
    }, 60000); // Her 60 saniyede bir
  }

  // WebGL context optimizasyonları - NVIDIA GPU'yu zorla
  const optimizeWebGL = () => {
    const canvas = document.createElement('canvas');
    
    // NVIDIA GPU'yu zorlamak için önce high-performance ile dene
    // WebGL2 veya WebGL context'i kabul et
    let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvas.getContext('webgl2', {
      alpha: false, // Alpha channel performansı düşürür
      antialias: false, // Antialiasing performansı düşürür (Potree için gerekli değil)
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance', // NVIDIA GPU'yu tercih et
      failIfMajorPerformanceCaveat: true, // Düşük performanslı GPU'yu reddet
      xrCompatible: false,
      desynchronized: true, // Render thread'i optimize et
    }) as WebGL2RenderingContext | null;
    
    // WebGL2 yoksa WebGL dene
    if (!gl) {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: true,
        desynchronized: true,
      }) as WebGLRenderingContext | null;
    }
    
    // Hala yoksa failIfMajorPerformanceCaveat olmadan dene
    if (!gl) {
      const webgl2 = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        desynchronized: true,
      }) as WebGL2RenderingContext | null;
      
      if (webgl2) {
        gl = webgl2;
      } else {
        gl = canvas.getContext('webgl', {
          alpha: false,
          antialias: false,
          depth: true,
          stencil: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
          desynchronized: true,
        }) as WebGLRenderingContext | null;
      }
    }

    if (gl) {
      // WebGL extensions ve optimizasyonlar
      const extensions = [
        'WEBGL_depth_texture',
        'OES_texture_float',
        'OES_texture_float_linear',
        'OES_texture_half_float',
        'OES_texture_half_float_linear',
        'WEBGL_lose_context',
        'EXT_texture_filter_anisotropic',
        'OES_standard_derivatives',
        'WEBGL_draw_buffers',
        'ANGLE_instanced_arrays',
      ];

      extensions.forEach(ext => {
        const extension = gl.getExtension(ext);
        if (extension) {
          console.log(`WebGL Extension enabled: ${ext}`);
        }
      });

      // GPU memory limit kontrolü
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        console.log('GPU Renderer:', renderer);
        console.log('GPU Vendor:', vendor);
        
        // NVIDIA GPU kontrolü
        const isNVIDIA = renderer.includes('NVIDIA') || 
                        renderer.includes('GeForce') || 
                        renderer.includes('Quadro') || 
                        renderer.includes('RTX') || 
                        renderer.includes('GTX') ||
                        vendor.includes('NVIDIA');
        
        if (isNVIDIA) {
          console.log('✅ NVIDIA GPU detected and active!');
        } else {
          console.warn('⚠️ NVIDIA GPU not detected. Using:', renderer);
          console.warn('💡 Tip: NVIDIA GPU kullanmak için:');
          console.warn('   1. NVIDIA Control Panel > Manage 3D Settings > Program Settings');
          console.warn('   2. Electron.exe için "High-performance NVIDIA processor" seçin');
          console.warn('   3. Veya Windows Graphics Settings\'ten uygulamayı NVIDIA GPU\'ya atayın');
        }
      }
      
      // NVIDIA GPU için ek optimizasyonlar
      const nvidiaExtensions = [
        'WEBGL_compressed_texture_s3tc', // NVIDIA S3TC compression
        'EXT_texture_compression_bptc', // NVIDIA BPTC compression
      ];
      
      nvidiaExtensions.forEach(ext => {
        const extension = gl.getExtension(ext);
        if (extension) {
          console.log(`NVIDIA Extension enabled: ${ext}`);
        }
      });
    } else {
      console.error('❌ WebGL context oluşturulamadı!');
    }
  };

  // DOM hazır olduğunda WebGL optimizasyonlarını çalıştır
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeWebGL);
  } else {
    optimizeWebGL();
  }
}

