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
import { 
  Folder, 
  File, 
  Trash2, 
  ExternalLink, 
  AlertTriangle, 
  FileText,
  Image,
  FileCode,
  FileJson,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  FileCheck,
  Database,
  Package,
  Settings,
  Globe
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

interface FolderStructureProps {
  rootPath?: string;
}

// File type icon mapping
const fileTypeIcons: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  // Images
  'jpg': { icon: Image, color: 'text-blue-400' },
  'jpeg': { icon: Image, color: 'text-blue-400' },
  'png': { icon: Image, color: 'text-blue-400' },
  'gif': { icon: Image, color: 'text-blue-400' },
  'bmp': { icon: Image, color: 'text-blue-400' },
  'svg': { icon: Image, color: 'text-blue-400' },
  'webp': { icon: Image, color: 'text-blue-400' },
  'ico': { icon: Image, color: 'text-blue-400' },
  'tif': { icon: Image, color: 'text-blue-400' },
  'tiff': { icon: Image, color: 'text-blue-400' },
  
  // Videos
  'mp4': { icon: FileVideo, color: 'text-purple-400' },
  'avi': { icon: FileVideo, color: 'text-purple-400' },
  'mov': { icon: FileVideo, color: 'text-purple-400' },
  'wmv': { icon: FileVideo, color: 'text-purple-400' },
  'flv': { icon: FileVideo, color: 'text-purple-400' },
  'mkv': { icon: FileVideo, color: 'text-purple-400' },
  'webm': { icon: FileVideo, color: 'text-purple-400' },
  
  // Audio
  'mp3': { icon: FileAudio, color: 'text-green-400' },
  'wav': { icon: FileAudio, color: 'text-green-400' },
  'flac': { icon: FileAudio, color: 'text-green-400' },
  'aac': { icon: FileAudio, color: 'text-green-400' },
  'ogg': { icon: FileAudio, color: 'text-green-400' },
  'wma': { icon: FileAudio, color: 'text-green-400' },
  
  // Archives
  'zip': { icon: FileArchive, color: 'text-yellow-400' },
  'rar': { icon: FileArchive, color: 'text-yellow-400' },
  '7z': { icon: FileArchive, color: 'text-yellow-400' },
  'tar': { icon: FileArchive, color: 'text-yellow-400' },
  'gz': { icon: FileArchive, color: 'text-yellow-400' },
  'bz2': { icon: FileArchive, color: 'text-yellow-400' },
  'xz': { icon: FileArchive, color: 'text-yellow-400' },
  
  // Code
  'js': { icon: FileCode, color: 'text-yellow-300' },
  'jsx': { icon: FileCode, color: 'text-yellow-300' },
  'ts': { icon: FileCode, color: 'text-blue-300' },
  'tsx': { icon: FileCode, color: 'text-blue-300' },
  'py': { icon: FileCode, color: 'text-blue-300' },
  'java': { icon: FileCode, color: 'text-orange-400' },
  'cpp': { icon: FileCode, color: 'text-blue-400' },
  'c': { icon: FileCode, color: 'text-blue-400' },
  'cs': { icon: FileCode, color: 'text-purple-400' },
  'php': { icon: FileCode, color: 'text-indigo-400' },
  'rb': { icon: FileCode, color: 'text-red-400' },
  'go': { icon: FileCode, color: 'text-cyan-400' },
  'rs': { icon: FileCode, color: 'text-orange-400' },
  'swift': { icon: FileCode, color: 'text-orange-400' },
  'kt': { icon: FileCode, color: 'text-purple-400' },
  'scala': { icon: FileCode, color: 'text-red-400' },
  'sh': { icon: FileCode, color: 'text-green-400' },
  'bash': { icon: FileCode, color: 'text-green-400' },
  'ps1': { icon: FileCode, color: 'text-blue-400' },
  'bat': { icon: FileCode, color: 'text-gray-400' },
  'cmd': { icon: FileCode, color: 'text-gray-400' },
  
  // Data formats
  'json': { icon: FileJson, color: 'text-green-400' },
  'xml': { icon: FileCode, color: 'text-orange-400' },
  'yaml': { icon: FileCode, color: 'text-purple-400' },
  'yml': { icon: FileCode, color: 'text-purple-400' },
  'toml': { icon: FileCode, color: 'text-yellow-400' },
  'ini': { icon: FileCode, color: 'text-gray-400' },
  'cfg': { icon: Settings, color: 'text-gray-400' },
  'conf': { icon: Settings, color: 'text-gray-400' },
  'config': { icon: Settings, color: 'text-gray-400' },
  
  // Documents
  'pdf': { icon: FileText, color: 'text-red-400' },
  'doc': { icon: FileText, color: 'text-blue-400' },
  'docx': { icon: FileText, color: 'text-blue-400' },
  'xls': { icon: FileSpreadsheet, color: 'text-green-400' },
  'xlsx': { icon: FileSpreadsheet, color: 'text-green-400' },
  'ppt': { icon: FileText, color: 'text-orange-400' },
  'pptx': { icon: FileText, color: 'text-orange-400' },
  'txt': { icon: FileText, color: 'text-gray-400' },
  'rtf': { icon: FileText, color: 'text-gray-400' },
  'md': { icon: FileText, color: 'text-gray-300' },
  'markdown': { icon: FileText, color: 'text-gray-300' },
  
  // Database
  'db': { icon: Database, color: 'text-blue-400' },
  'sqlite': { icon: Database, color: 'text-blue-400' },
  'sql': { icon: Database, color: 'text-blue-400' },
  'mdb': { icon: Database, color: 'text-blue-400' },
  'accdb': { icon: Database, color: 'text-blue-400' },
  
  // 3D/Point Cloud
  'las': { icon: Package, color: 'text-cyan-400' },
  'laz': { icon: Package, color: 'text-cyan-400' },
  'ply': { icon: Package, color: 'text-cyan-400' },
  'obj': { icon: Package, color: 'text-cyan-400' },
  'fbx': { icon: Package, color: 'text-cyan-400' },
  'dae': { icon: Package, color: 'text-cyan-400' },
  '3ds': { icon: Package, color: 'text-cyan-400' },
  'blend': { icon: Package, color: 'text-cyan-400' },
  
  // Web
  'html': { icon: Globe, color: 'text-orange-400' },
  'htm': { icon: Globe, color: 'text-orange-400' },
  'css': { icon: FileCode, color: 'text-blue-400' },
  'scss': { icon: FileCode, color: 'text-pink-400' },
  'sass': { icon: FileCode, color: 'text-pink-400' },
  'less': { icon: FileCode, color: 'text-blue-400' },
  
  // Project files
  'rotg': { icon: FileCheck, color: 'text-primary' },
};

// Get file icon based on extension
const getFileIcon = (fileName: string): { icon: React.ComponentType<any>; color: string } => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return fileTypeIcons[extension] || { icon: File, color: 'text-muted-foreground' };
};

function FolderStructure({ rootPath: initialPath }: FolderStructureProps) {
  const [fileTree, setFileTree] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ path: string; name: string } | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const currentPath = useSelector((state: RootState) => state.projectReducer.project?.project.path || '');
  const projectFolderPath = useSelector((state: RootState) => state.projectReducer.projectFolderPath);
  const projectName = useSelector((state: RootState) => state.projectReducer.project?.project.name || 'Untitled Project');

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
            const { icon: FileIcon, color } = getFileIcon(item.name);
            return (
              <ContextMenu key={item.path}>
                <ContextMenuTrigger asChild>
                  <div className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-sm text-xs cursor-pointer">
                    <FileIcon className={`h-3 w-3 ${color} flex-shrink-0`} />
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

  const handleLoadPath = () => {
    if (currentPath.trim()) {
      loadDirectory(currentPath.trim());
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
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
        ) : (
          <>
            
            {fileTree.length > 0 && (
              <>
                <div className="mb-2 pb-2 border-b border-border">
                  <div className="text-xs font-semibold text-muted-foreground truncate">
                    {currentPath}
                  </div>
                </div>
                {renderFileTree(fileTree)}
              </>
            )}
          </>
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
