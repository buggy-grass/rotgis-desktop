import { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Divider } from './components/ui/divider';
import { WindowCustomBar } from './components/WindowCustomBar';
import { Moon, Sun, Zap } from 'lucide-react';
import "./services/EventEmitter";
import PotreeViewer from './components/viewer/PotreeViewer';
import React from 'react';

// Potree için performans optimizasyonları
const App = memo(function App() {
  // Performance monitoring için ref
  const renderCount = useRef(0);
  renderCount.current += 1;
  const [viewer, setViewer] = React.useState<any>(false);

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

  // Callback memoization - event handler'lar için
  const handleButtonClick = useCallback((variant: string) => {
    console.log(`Button clicked: ${variant}`);
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <WindowCustomBar />
      <div className="flex-1 container mx-auto p-8 overflow-auto">
        <Button onClick={() => setViewer(true)}>Open Viewer</Button>
        {viewer && <PotreeViewer display="block" />}
      </div>
    </div>
  );
});

// Display name for React DevTools
App.displayName = 'App';

export default App;
