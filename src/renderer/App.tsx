import { memo, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { WindowCustomBar } from './components/WindowCustomBar';
import "./services/EventEmitter";
import PotreeViewer from './components/viewer/PotreeViewer';
import React from 'react';
import HeightProfileViewer from './components/viewer/HeightProfileViewer';
import StatusBar from './components/StatusBar';
import Main from './components/pages/Main';
import { setupProjectAutoSave } from './services/ProjectAutoSave';
import ProjectActions from './store/actions/ProjectActions';
import ProjectService from './services/ProjectService';
import store, { RootState } from './store/store';
import { useSelector } from 'react-redux';
import { LoadingDialog } from './components/dialogs/LoadingDialog';

// Potree için performans optimizasyonları
const App = memo(function App() {
  // Performance monitoring için ref
  const renderCount = useRef(0);
  renderCount.current += 1;
  const project = useSelector((state: RootState) => state.projectReducer.project);
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

  useEffect(() => {
    console.log("Current project changed:", project);
  }, [project]);

  // Initialize project and auto-save
  useEffect(() => {
    // Create default project if none exists
    const projectState = store.getState().projectReducer;
    if (!projectState.project) {
      const defaultProject = ProjectService.createNewProject("Untitled Project", "");
      ProjectActions.setProject(defaultProject);
    }

    // Setup auto-save
    setupProjectAutoSave();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Main/>
        <LoadingDialog />
    </div>
  );
});

// Display name for React DevTools
App.displayName = 'App';

export default App;
