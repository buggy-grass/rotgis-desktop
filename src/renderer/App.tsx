import { memo, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { WindowCustomBar } from './components/WindowCustomBar';
import "./services/EventEmitter";
import PotreeViewer from './components/viewer/PotreeViewer';
import React from 'react';
import HeightProfileViewer from './components/viewer/HeightProfileViewer';
import StatusBar from './components/StatusBar';
import Main from './components/pages/Main';

// Potree için performans optimizasyonları
const App = memo(function App() {
  // Performance monitoring için ref
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Potree için memory ve performance optimizasyonları
  useEffect(() => {
    // RequestAnimationFrame throttling optimizasyonu
    let rafId: number;
    let lastFrameTime = performance.now();
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const optimizedRAF = (callback: FrameRequestCallback) => {
      const currentTime = performance.now();
      const elapsed = currentTime - lastFrameTime;

      if (elapsed >= frameInterval) {
        lastFrameTime = currentTime - (elapsed % frameInterval);
        callback(currentTime);
      } else {
        rafId = requestAnimationFrame(optimizedRAF.bind(null, callback));
      }
    };

    // Memory optimizasyonu - unused resources temizleme
    const cleanup = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };

    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Main/>
    </div>
  );
});

// Display name for React DevTools
App.displayName = 'App';

export default App;
