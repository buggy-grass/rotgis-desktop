import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Folder, File, ChevronRight, FolderOpen, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

interface FolderStructureProps {
  rootPath?: string;
}

function FolderStructure({ rootPath: initialPath }: FolderStructureProps) {
  const [fileTree, setFileTree] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ path: string; name: string } | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  }, [currentPath]);

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    setError(null);
    try {
      // Wait a bit for electronAPI to be available (in case of timing issues)
      let retries = 0;
      const maxRetries = 10;
      while (!window.electronAPI && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (!window.electronAPI) {
        setError('Electron API not available. Please restart the application.');
        console.error('window.electronAPI is undefined');
        return;
      }

      if (!window.electronAPI.readDirectory) {
        setError('readDirectory function not available in Electron API');
        console.error('window.electronAPI.readDirectory is undefined', window.electronAPI);
        return;
      }

      const items = await window.electronAPI.readDirectory(dirPath);
      setFileTree(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
      console.error('Error loading directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (itemPath: string, itemName: string) => {
    setItemToDelete({ path: itemPath, name: itemName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      if (window.electronAPI && window.electronAPI.deleteFile) {
        await window.electronAPI.deleteFile(itemToDelete.path);
        setDeleteDialogOpen(false);
        setItemToDelete(null);
        // Reload directory after deletion
        if (currentPath) {
          await loadDirectory(currentPath);
        }
      } else {
        setErrorMessage('Delete function not available');
        setErrorDialogOpen(true);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to delete: ${err.message || 'Unknown error'}`);
      setErrorDialogOpen(true);
      console.error('Error deleting file:', err);
    }
  };

  const handleOpenInExplorer = async (itemPath: string) => {
    try {
      if (window.electronAPI && window.electronAPI.openInExplorer) {
        await window.electronAPI.openInExplorer(itemPath);
      } else {
        setErrorMessage('Open in Explorer function not available');
        setErrorDialogOpen(true);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to open in Explorer: ${err.message || 'Unknown error'}`);
      setErrorDialogOpen(true);
      console.error('Error opening in Explorer:', err);
    }
  };

  const renderFileTree = (items: FileSystemItem[], level: number = 0): React.ReactNode => {
    if (!items || items.length === 0) {
      return null;
    }

    return (
      <div className="pl-2">
        {items.map((item) => {
          if (item.type === 'directory') {
            const hasChildren = item.children && item.children.length > 0;
            return (
              <ContextMenu key={item.path}>
                <ContextMenuTrigger asChild>
                  <div>
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full"
                    >
                      <AccordionItem value={item.path} className="border-none">
                        <AccordionTrigger className="py-1 px-2 hover:bg-accent rounded-sm text-xs">
                          <div className="flex items-center gap-2 flex-1 text-left">
                            <Folder className="h-3 w-3 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pt-0">
                          {hasChildren ? (
                            renderFileTree(item.children!, level + 1)
                          ) : (
                            <div className="pl-4 text-xs text-muted-foreground py-1">
                              Empty folder
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem
                    onClick={() => handleOpenInExplorer(item.path)}
                    className="text-xs"
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Open in Explorer
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => handleDeleteClick(item.path, item.name)}
                    className="text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          } else {
            return (
              <ContextMenu key={item.path}>
                <ContextMenuTrigger asChild>
                  <div className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-sm text-xs cursor-pointer">
                    <File className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem
                    onClick={() => handleOpenInExplorer(item.path)}
                    className="text-xs"
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Open in Explorer
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => handleDeleteClick(item.path, item.name)}
                    className="text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          }
        })}
      </div>
    );
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPath(e.target.value);
  };

  const handleLoadPath = () => {
    if (currentPath.trim()) {
      loadDirectory(currentPath.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLoadPath();
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          type="text"
          placeholder="Enter folder path..."
          value={currentPath}
          onChange={handlePathChange}
          onKeyPress={handleKeyPress}
          className="flex-1 text-xs h-7"
        />
        <Button
          onClick={handleLoadPath}
          size="sm"
          variant="default"
          className="h-7 px-3 text-xs"
          disabled={loading || !currentPath.trim()}
        >
          Load
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-4 text-sm text-destructive">
            Error: {error}
          </div>
        ) : !currentPath ? (
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
            Enter a folder path to view its structure
          </div>
        ) : fileTree.length > 0 ? (
          <>
            <div className="mb-2 pb-2 border-b border-border">
              <div className="text-xs font-semibold text-muted-foreground truncate">
                {currentPath}
              </div>
            </div>
            {renderFileTree(fileTree)}
          </>
        ) : (
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
            No files found
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent 
          className="sm:max-w-[425px]"
          title="Delete Item"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-foreground">
                  Are you sure you want to delete <strong>"{itemToDelete?.name}"</strong>?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="mr-1.5 h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent 
          className="sm:max-w-[425px]"
          title="Error"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground flex-1">
                {errorMessage}
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                variant="default"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  setErrorDialogOpen(false);
                  setErrorMessage('');
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FolderStructure;
