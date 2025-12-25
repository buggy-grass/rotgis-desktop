import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Minus, Square, X, TabletSmartphone } from 'lucide-react';
import { Button } from './ui/button';
import { RootState } from '../store/store';
import { Menubar } from './ui/menubar';
import WindowMenu from './menu/WindowMenu';

export function WindowCustomBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [electronAPIReady, setElectronAPIReady] = useState(false);
  
  // Store'dan veri al
  const appName = useSelector((state: RootState) => state.appReducer.appName);
  const projectState = useSelector((state: RootState) => state.projectReducer);
  const projectName = projectState.project?.project.name || "Untitled Project";

  // Electron API'nin hazır olmasını bekle
  useEffect(() => {
    const checkElectronAPI = () => {
      if (window.electronAPI) {
        setElectronAPIReady(true);
        // İlk durumu kontrol et
        window.electronAPI.windowIsMaximized().then(setIsMaximized).catch(() => {
          // Hata durumunda false olarak ayarla
          setIsMaximized(false);
        });
        return true;
      }
      return false;
    };

    // Hemen kontrol et
    if (checkElectronAPI()) {
      return; // API hazırsa cleanup gerekmez
    }

    // Eğer hazır değilse, kısa aralıklarla kontrol et
    const interval = setInterval(() => {
      if (checkElectronAPI()) {
        clearInterval(interval);
      }
    }, 100);

    // 5 saniye sonra timeout
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Maximize/unmaximize event'lerini dinle
  useEffect(() => {
    if (!electronAPIReady || !window.electronAPI) return;

    const handleMaximize = (maximized: boolean) => {
      setIsMaximized(maximized);
    };

    const handleUnmaximize = () => {
      setIsMaximized(false);
    };

    window.electronAPI.onWindowMaximize(handleMaximize);
    window.electronAPI.onWindowUnmaximize(handleUnmaximize);

    // Cleanup
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('window-maximized');
        window.electronAPI.removeAllListeners('window-unmaximized');
      }
    };
  }, [electronAPIReady]);

  const handleMinimize = useCallback(() => {
    if (window.electronAPI?.windowMinimize) {
      try {
        window.electronAPI.windowMinimize();
      } catch (error) {
        console.error('Minimize error:', error);
      }
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if (window.electronAPI?.windowMaximize) {
      try {
        window.electronAPI.windowMaximize();
      } catch (error) {
        console.error('Maximize error:', error);
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    if (window.electronAPI?.windowClose) {
      try {
        window.electronAPI.windowClose();
      } catch (error) {
        console.error('Close error:', error);
      }
    }
  }, []);

  return (
    <div className="h-8 bg-background border-b border-border flex items-center justify-between select-none drag-region" style={{ zIndex: 10001, position: "relative" }}>
      {/* Sol taraf - Uygulama ismi */}
      <div className="flex items-center gap-2 px-4 no-drag">
        {/* <span className="text-xs font-medium text-foreground">{appName}</span> */}
        <WindowMenu />
      </div>

      {/* Orta - Proje ismi (drag region) */}
      <div className="flex-1 flex items-center justify-center drag-region">
        <span className="text-xs font-semibold text-foreground pointer-events-none">{projectName}</span>
      </div>

      {/* Sağ taraf - Window kontrol butonları */}
      <div className="flex items-center no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-12 rounded-none hover:bg-muted"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-12 rounded-none hover:bg-muted"
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <TabletSmartphone className="h-4 w-4" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-12 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <style>{`
        .drag-region {
          -webkit-app-region: drag;
          user-select: none;
        }
        .no-drag {
          -webkit-app-region: no-drag;
        }
        .no-drag button {
          -webkit-app-region: no-drag;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

