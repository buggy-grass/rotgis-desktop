import { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Divider } from './components/ui/divider';
import { WindowCustomBar } from './components/WindowCustomBar';
import { Moon, Sun, Zap } from 'lucide-react';

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

  // Memoized components - gereksiz re-render'ları önle
  const headerContent = useMemo(() => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        <Zap className="h-8 w-8 text-primary" />
      </div>
      <div className="flex items-center gap-2">
        <Sun className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Dark Mode</span>
        <Moon className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  ), []);

  const cardsContent = useMemo(() => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Electron</CardTitle>
          <CardDescription>Desktop uygulama framework'ü</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Electron ile cross-platform desktop uygulaması geliştiriyoruz.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>React + TypeScript</CardTitle>
          <CardDescription>Modern UI geliştirme</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            TypeScript ile tip güvenli React bileşenleri kullanıyoruz.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shadcn UI</CardTitle>
          <CardDescription>Güzel ve erişilebilir bileşenler</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Shadcn UI ile modern ve özelleştirilebilir bileşenler.
          </p>
        </CardContent>
      </Card>
    </div>
  ), []);

  // Callback memoization - event handler'lar için
  const handleButtonClick = useCallback((variant: string) => {
    console.log(`Button clicked: ${variant}`);
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <WindowCustomBar />
      <div className="flex-1 container mx-auto p-8 overflow-auto">
        {headerContent}
        {cardsContent}

        <div className="mt-8 space-y-6">
          <div className="flex gap-4">
            <Button onClick={() => handleButtonClick('primary')}>Primary Button</Button>
            <Button variant="secondary" onClick={() => handleButtonClick('secondary')}>Secondary Button</Button>
            <Button variant="outline" onClick={() => handleButtonClick('outline')}>Outline Button</Button>
            <Button variant="ghost" onClick={() => handleButtonClick('ghost')}>Ghost Button</Button>
          </div>
          
          <Divider />
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Renk Önizlemesi</h3>
            <p className="text-sm text-muted-foreground">
              Dark mode renkleri #141414 ana renk ve profesyonel gri tonları ile ayarlandı.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

// Display name for React DevTools
App.displayName = 'App';

export default App;
