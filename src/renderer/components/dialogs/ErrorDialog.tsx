import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title,
  message,
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} showCloseButton>
        <DialogHeader>
          <DialogDescription style={{ color: "#a3a3a3" }}>
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

