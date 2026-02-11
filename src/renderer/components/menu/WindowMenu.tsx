import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "../ui/menubar";
import { useState } from "react";
import { useSelector } from "react-redux";
import { openProject } from "../../services/ProjectLoadService";
import { ErrorDialog } from "../dialogs/ErrorDialog";
import { SaveProjectDialog } from "../dialogs/SaveProjectDialog";
import { RootState } from "../../store/store";
import { manualSaveProject } from "../../services/ProjectAutoSave";
import ProjectService from "../../services/ProjectService";
import ProjectActions from "../../store/actions/ProjectActions";

const WindowMenu = () => {
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const projectState = useSelector((state: RootState) => state.projectReducer);
  const currentProject = projectState.project;

  const handleOpenProject = async () => {
    try {
      await openProject();
    } catch (error) {
      setErrorTitle("Error Opening Project");
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred while opening the project."
      );
      setErrorDialogOpen(true);
    }
  };

  const handleSaveProject = async () => {
    if (!currentProject) {
      setErrorTitle("Error Saving Project");
      setErrorMessage("No project to save");
      setErrorDialogOpen(true);
      return;
    }

    // If project is "Untitled Project" or has no file path, open dialog
    if (currentProject.project.name === "Untitled Project" || !projectState.projectFilePath) {
      setShowSaveDialog(true);
    } else {
      // Project already saved, save over existing file
      try {
        await manualSaveProject();
      } catch (error) {
        setErrorTitle("Error Saving Project");
        setErrorMessage(
          error instanceof Error ? error.message : "An unknown error occurred while saving the project."
        );
        setErrorDialogOpen(true);
      }
    }
  };

  const handleSaveDialogSave = async (projectName: string, savePath: string, epsg: number) => {
    if (!currentProject) {
      throw new Error('No project to save');
    }

    try {
      // Update project name
      currentProject.project.name = projectName;
      
      // Update project EPSG
      currentProject.project.outcoordsys.epsg.code = epsg;
      
      // Save project
      const result = await ProjectService.save(currentProject, savePath);
      console.log('Project saved:', result);
      
      // Update project in store
      ProjectActions.updateProject(currentProject);
      ProjectActions.setProjectPaths(result.projectFile, result.projectFolder);
      if (window.electronAPI?.setRasterServerPath) {
        window.electronAPI.setRasterServerPath(result.projectFolder ?? null);
      }
      ProjectActions.setDirty(false);
      
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  };
  return (
    <>
      <ErrorDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title={errorTitle}
        message={errorMessage}
      />
      <SaveProjectDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        projectName={currentProject?.project.name || "Untitled Project"}
        onSave={handleSaveDialogSave}
      />
      <Menubar className="h-6 text-xs" style={{ border: "none", zIndex: 10002, position: "relative" }}>
        <MenubarMenu>
          <MenubarTrigger className="h-6 px-2 text-xs">File</MenubarTrigger>
          <MenubarContent className="text-xs" style={{ zIndex: 10002 }}>
            <MenubarItem className="text-xs py-1">
              New Project <MenubarShortcut className="text-[10px]">Ctrl + N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs py-1" onClick={handleOpenProject}>
              Open Project... <MenubarShortcut className="text-[10px]">Ctrl + O</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem className="text-xs py-1" onClick={handleSaveProject}>
              Save Project <MenubarShortcut className="text-[10px]">Ctrl + S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
          <MenubarItem className="text-xs py-1">
            New Window <MenubarShortcut className="text-[10px]">⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem className="text-xs py-1" disabled>New Incognito Window</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger className="text-xs py-1">Share</MenubarSubTrigger>
            <MenubarSubContent className="text-xs" style={{ zIndex: 10003 }}>
              <MenubarItem className="text-xs py-1">Email link</MenubarItem>
              <MenubarItem className="text-xs py-1">Messages</MenubarItem>
              <MenubarItem className="text-xs py-1">Notes</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem className="text-xs py-1">
            Print... <MenubarShortcut className="text-[10px]">⌘P</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="h-6 px-2 text-xs">Layer</MenubarTrigger>
        <MenubarContent className="text-xs" style={{ zIndex: 10002 }}>
          <MenubarItem className="text-xs py-1">
            Undo <MenubarShortcut className="text-[10px]">⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem className="text-xs py-1">
            Redo <MenubarShortcut className="text-[10px]">⇧⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger className="text-xs py-1">Find</MenubarSubTrigger>
            <MenubarSubContent className="text-xs" style={{ zIndex: 10003 }}>
              <MenubarItem className="text-xs py-1">Search the web</MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-1">Find...</MenubarItem>
              <MenubarItem className="text-xs py-1">Find Next</MenubarItem>
              <MenubarItem className="text-xs py-1">Find Previous</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem className="text-xs py-1">Cut</MenubarItem>
          <MenubarItem className="text-xs py-1">Copy</MenubarItem>
          <MenubarItem className="text-xs py-1">Paste</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="h-6 px-2 text-xs">View</MenubarTrigger>
        <MenubarContent className="text-xs" style={{ zIndex: 10002 }}>
          <MenubarCheckboxItem className="text-xs py-1">Always Show Bookmarks Bar</MenubarCheckboxItem>
          <MenubarCheckboxItem className="text-xs py-1" checked>
            Always Show Full URLs
          </MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem className="text-xs py-1" inset>
            Reload <MenubarShortcut className="text-[10px]">⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarItem className="text-xs py-1" disabled inset>
            Force Reload <MenubarShortcut className="text-[10px]">⇧⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem className="text-xs py-1" inset>Toggle Fullscreen</MenubarItem>
          <MenubarSeparator />
          <MenubarItem className="text-xs py-1" inset>Hide Sidebar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="h-6 px-2 text-xs">Layer</MenubarTrigger>
        <MenubarContent className="text-xs" style={{ zIndex: 10002 }}>
          <MenubarRadioGroup value="benoit">
            <MenubarRadioItem className="text-xs py-1" value="andy">Andy</MenubarRadioItem>
            <MenubarRadioItem className="text-xs py-1" value="benoit">Benoit</MenubarRadioItem>
            <MenubarRadioItem className="text-xs py-1" value="Luis">Luis</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarItem className="text-xs py-1" inset>Edit...</MenubarItem>
          <MenubarSeparator />
          <MenubarItem className="text-xs py-1" inset>Add Profile...</MenubarItem>
          <MenubarItem className="text-xs py-1" inset>Add Profile...</MenubarItem>
          <MenubarItem className="text-xs py-1" inset>Add Profile...</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      </Menubar>
    </>
  )
}

export default WindowMenu;
