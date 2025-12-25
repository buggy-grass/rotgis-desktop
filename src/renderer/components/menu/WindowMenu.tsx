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
import { openProject } from "../../services/ProjectLoadService";
import { ErrorDialog } from "../dialogs/ErrorDialog";

const WindowMenu = () => {
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
  return (
    <>
      <ErrorDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title={errorTitle}
        message={errorMessage}
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
        <MenubarTrigger className="h-6 px-2 text-xs">Edit</MenubarTrigger>
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
        <MenubarTrigger className="h-6 px-2 text-xs">Profiles</MenubarTrigger>
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
