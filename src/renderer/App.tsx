import { memo, useEffect, useRef } from 'react';
import "./services/EventEmitter";
import React from 'react';
import Main from './components/pages/Main';
import { setupProjectAutoSave } from './services/ProjectAutoSave';
import ProjectActions from './store/actions/ProjectActions';
import ProjectService from './services/ProjectService';
import store, { RootState } from './store/store';
import { useSelector } from 'react-redux';
import { LoadingDialog } from './components/dialogs/LoadingDialog';
import AppConfigService from './services/AppConfigService';
import SettingsActions from './store/actions/SettingsActions';
import PotreeService from './services/PotreeService';

// Potree için performans optimizasyonları
const App = memo(function App() {
  // Performance monitoring için ref
  const viewerLoaded = useSelector((state: RootState) => state.appReducer.viewerLoaded);
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Initialize project, config, and auto-save
  useEffect(() => {
    if(viewerLoaded){
      const initializeApp = async () => {
        // Load config file
        
  
        // Create default project if none exists
        const projectState = store.getState().projectReducer;
        if (!projectState.project) {
          const defaultProject = ProjectService.createNewProject("Untitled Project", "");
          ProjectActions.setProject(defaultProject);
        }
  
        // Setup auto-save
        setupProjectAutoSave();
  
        try {
          const configState = await AppConfigService.loadSettingsState();
          if (configState && Object.keys(configState).length > 0) {
            // Load all settings at once (without triggering saveConfig)
            PotreeService.setMouseConfigurations(configState.zoomButton, configState.rotateButton, configState.dragButton, configState.zoomSpeed, configState.rotationSpeed);
            SettingsActions.loadSettings(configState);
          }
        } catch (error) {
          console.error("Error loading app config:", error);
        }
      };
  
      initializeApp();
    }
  }, [viewerLoaded]);

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
