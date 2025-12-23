import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Folder, File, ChevronRight, FolderOpen } from 'lucide-react';
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
              <Accordion
                key={item.path}
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
            );
          } else {
            return (
              <div
                key={item.path}
                className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-sm text-xs"
              >
                <File className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </div>
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
    </div>
  );
}

export default FolderStructure;
