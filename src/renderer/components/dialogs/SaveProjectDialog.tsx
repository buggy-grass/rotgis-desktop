import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FolderOpen } from 'lucide-react';

interface SaveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onSave: (projectName: string, savePath: string, epsg: number) => Promise<void>;
}

const COMMON_EPSG_CODES = [
  { code: 32636, name: 'WGS 84 / UTM zone 36N (32636)' },
  { code: 32635, name: 'WGS 84 / UTM zone 35N (32635)' },
  { code: 32637, name: 'WGS 84 / UTM zone 37N (32637)' },
  { code: 4326, name: 'WGS 84 (4326)' },
  { code: 3857, name: 'Web Mercator (3857)' },
  { code: 32633, name: 'WGS 84 / UTM zone 33N (32633)' },
  { code: 32634, name: 'WGS 84 / UTM zone 34N (32634)' },
];

export function SaveProjectDialog({
  open,
  onOpenChange,
  projectName,
  onSave,
}: SaveProjectDialogProps) {
  const [projectNameInput, setProjectNameInput] = useState<string>('Untitled Project');
  const [savePath, setSavePath] = useState<string>('');
  const [epsg, setEpsg] = useState<number>(32636);
  const [customEpsg, setCustomEpsg] = useState<string>('');
  const [useCustomEpsg, setUseCustomEpsg] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setProjectNameInput(projectName || 'Untitled Project');
      setSavePath('');
      setEpsg(32636);
      setCustomEpsg('');
      setUseCustomEpsg(false);
      setIsSaving(false);
    }
  }, [open, projectName]);

  const handleBrowseFolder = async () => {
    try {
      // Wait for electronAPI to be available
      if (!window.electronAPI) {
        console.warn('Electron API not available, waiting...');
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }
      }

      if (!window.electronAPI.showFolderPicker) {
        throw new Error('showFolderPicker function not available');
      }

      const selectedPath = await window.electronAPI.showFolderPicker({
        defaultPath: savePath || undefined,
      });

      if (selectedPath) {
        setSavePath(selectedPath);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert(`Error selecting folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    const trimmedProjectName = projectNameInput.trim();
    if (!trimmedProjectName) {
      alert('Please enter a project name');
      return;
    }

    if (!savePath) {
      alert('Please select a save location');
      return;
    }

    const finalEpsg = useCustomEpsg ? parseInt(customEpsg, 10) : epsg;
    if (isNaN(finalEpsg) || finalEpsg <= 0) {
      alert('Please enter a valid EPSG code');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedProjectName, savePath, finalEpsg);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving project:', error);
      alert(`Error saving project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Save Project" showCloseButton>
        <DialogHeader>
          <DialogDescription style={{ color: "#a3a3a3" }}>
            Enter project name, choose where to save, and select the EPSG coordinate system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              placeholder="Untitled Project"
              disabled={isSaving}
            />
          </div>

          {/* Save Location */}
          <div className="space-y-2">
            <Label htmlFor="save-path">Save Location</Label>
            <div className="flex gap-2">
              <Input
                id="save-path"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="Select folder..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBrowseFolder}
                className="px-3"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* EPSG Selection */}
          <div className="space-y-2">
            <Label htmlFor="epsg">EPSG Code</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  id="epsg"
                  value={useCustomEpsg ? 'custom' : epsg}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setUseCustomEpsg(true);
                    } else {
                      setUseCustomEpsg(false);
                      setEpsg(parseInt(e.target.value, 10));
                    }
                  }}
                  disabled={isSaving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {COMMON_EPSG_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                  <option value="custom">Custom EPSG...</option>
                </select>
              </div>

              {useCustomEpsg && (
                <Input
                  type="number"
                  value={customEpsg}
                  onChange={(e) => setCustomEpsg(e.target.value)}
                  placeholder="Enter EPSG code (e.g., 32636)"
                  min="1"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !savePath || !projectNameInput.trim()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

