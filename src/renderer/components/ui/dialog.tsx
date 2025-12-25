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
  // Use very high z-index to ensure dialog is always on top
  const getOverlayZIndex = () => {
    // Use a very high z-index to ensure dialog is always on top of everything
    return 99998;
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
    // Use a very high z-index to ensure dialog content is always on top of overlay
    return 99999;
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-none overflow-hidden flex flex-col",
          className
        )}
        style={{ 
          zIndex: getContentZIndex(),
          background: "#1e1e1e",
          border: "1px solid #404040",
          borderRadius: "0",
        }}
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
        <div 
          className="h-6 bg-background border-b border-border flex items-center justify-between select-none"
          style={{
            background: "#262626",
            borderBottom: "1px solid #404040",
            height: "24px",
          }}
        >
          {/* Title - Sol tarafta */}
          <div className="flex items-center gap-2 px-3 flex-1">
            {title && (
              <span 
                className="text-xs font-medium"
                style={{ color: "#e5e5e5" }}
              >
                {title}
              </span>
            )}
          </div>

          {/* Close Button */}
          {showCloseButton && (
            <div className="flex items-center">
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-8 rounded-none hover:bg-destructive hover:text-destructive-foreground"
                  style={{
                    height: "24px",
                    width: "32px",
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 overflow-auto p-6"
          style={{
            background: "#1e1e1e",
            color: "#e5e5e5",
          }}
        >
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

