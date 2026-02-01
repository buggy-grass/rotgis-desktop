import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export interface AddAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (header: string, content: string) => void;
}

const AddAnnotationDialog: React.FC<AddAnnotationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [header, setHeader] = useState("");
  const [content, setContent] = useState("");

  const handleConfirm = () => {
    const trimmedHeader = header.trim();
    const trimmedContent = content.trim();
    if (!trimmedHeader) return;
    onConfirm(trimmedHeader, trimmedContent);
    setHeader("");
    setContent("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setHeader("");
      setContent("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent title="Annotation Ekle" showCloseButton>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="annotation-header" className="text-xs text-[#e5e5e5]">
              Başlık
            </Label>
            <Input
              id="annotation-header"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Annotation başlığı"
              className="bg-[#262626] border-[#404040] text-sm text-[#e5e5e5] placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annotation-content" className="text-xs text-[#e5e5e5]">
              İçerik
            </Label>
            <Input
              id="annotation-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Açıklama veya not"
              className="bg-[#262626] border-[#404040] text-sm text-[#e5e5e5] placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="border-[#404040]"
          >
            İptal
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!header.trim()}
          >
            Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAnnotationDialog;
