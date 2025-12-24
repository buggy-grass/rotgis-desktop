import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { Button } from "./button"

import { cn } from "../../lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  // Get potree_render_area and set overlay z-index to be always above it
  // PotreeViewer's highest z-index is 10000, so we set overlay to 10005
  const getOverlayZIndex = () => {
    const potreeRenderArea = document.getElementById('potree_render_area');
    const viewerContainer = document.getElementById('viewerContainer');
    
    // Get the highest z-index from potree elements
    let maxZIndex = 10000; // Default to PotreeViewer's max z-index
    
    if (viewerContainer) {
      const containerZIndex = window.getComputedStyle(viewerContainer).zIndex;
      if (containerZIndex && containerZIndex !== 'auto') {
        maxZIndex = Math.max(maxZIndex, parseInt(containerZIndex) || 10000);
      }
    }
    
    // Always be above potree elements
    return maxZIndex + 5;
  };

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      style={{ 
        zIndex: getOverlayZIndex(),
        pointerEvents: 'auto',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      {...props}
    />
  );
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string;
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, title, showCloseButton = true, ...props }, ref) => {
  // Get potree_render_area and set content z-index to be always above overlay
  const getContentZIndex = () => {
    const potreeRenderArea = document.getElementById('potree_render_area');
    const viewerContainer = document.getElementById('viewerContainer');
    
    // Get the highest z-index from potree elements
    let maxZIndex = 10000; // Default to PotreeViewer's max z-index
    
    if (viewerContainer) {
      const containerZIndex = window.getComputedStyle(viewerContainer).zIndex;
      if (containerZIndex && containerZIndex !== 'auto') {
        maxZIndex = Math.max(maxZIndex, parseInt(containerZIndex) || 10000);
      }
    }
    
    // Content should be above overlay (overlay + 1)
    return maxZIndex + 6;
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden flex flex-col",
          className
        )}
        style={{ zIndex: getContentZIndex() }}
        {...props}
      >
        {/* DialogTitle for accessibility */}
        <DialogPrimitive.Title className="sr-only">
          {title || "Dialog"}
        </DialogPrimitive.Title>
        
        {/* DialogDescription for accessibility */}
        <DialogPrimitive.Description className="sr-only">
          {title ? `${title} dialog` : "Dialog content"}
        </DialogPrimitive.Description>

        {/* Custom Window Bar */}
        <div className="h-8 bg-background border-b border-border flex items-center justify-between select-none">
          {/* Title */}
          <div className="flex items-center gap-2 px-4 flex-1">
            {title && (
              <span className="text-xs font-semibold text-foreground">{title}</span>
            )}
          </div>

          {/* Close Button */}
          {showCloseButton && (
            <div className="flex items-center">
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-12 rounded-none hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

