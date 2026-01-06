import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "../../lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  showArrow?: boolean
  arrowSize?: number
  arrowClassName?: string
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, showArrow = true, arrowSize = 4, arrowClassName, style, ...props }, ref) => {
  const arrowOffset = arrowSize + 1 // before için
  const arrowOffsetAfter = arrowSize // after için

  // Arrow size için CSS custom properties
  const arrowStyle = showArrow ? {
    '--arrow-offset': `${arrowOffset}px`,
    '--arrow-offset-after': `${arrowOffsetAfter}px`,
    ...style,
  } as React.CSSProperties & { '--arrow-offset'?: string; '--arrow-offset-after'?: string } : style

  // Border size için sabit değerler (arrowClassName ile override edilebilir)
  const borderSizeClass = arrowSize <= 2 ? "before:border-2 after:border-2" :
                          arrowSize <= 4 ? "before:border-4 after:border-4" :
                          arrowSize <= 6 ? "before:border-[6px] after:border-[6px]" :
                          "before:border-[8px] after:border-[8px]"

  return (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
      style={arrowStyle}
    className={cn(
        "z-[10004] overflow-visible rounded-md border bg-popover px-2 py-1 text-[12px] text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        showArrow && [
          "before:content-[''] before:absolute before:w-0 before:h-0 before:border-transparent",
          borderSizeClass,
          "data-[side=top]:before:bottom-[calc(var(--arrow-offset)*-1)] data-[side=top]:before:left-1/2 data-[side=top]:before:-translate-x-1/2 data-[side=top]:before:border-t-popover",
          "data-[side=bottom]:before:top-[calc(var(--arrow-offset)*-1)] data-[side=bottom]:before:left-1/2 data-[side=bottom]:before:-translate-x-1/2 data-[side=bottom]:before:border-b-popover",
          "data-[side=left]:before:right-[calc(var(--arrow-offset)*-1)] data-[side=left]:before:top-1/2 data-[side=left]:before:-translate-y-1/2 data-[side=left]:before:border-l-popover",
          "data-[side=right]:before:left-[calc(var(--arrow-offset)*-1)] data-[side=right]:before:top-1/2 data-[side=right]:before:-translate-y-1/2 data-[side=right]:before:border-r-popover",
          "after:content-[''] after:absolute after:w-0 after:h-0 after:border-transparent",
          "data-[side=top]:after:bottom-[calc(var(--arrow-offset-after)*-1)] data-[side=top]:after:left-1/2 data-[side=top]:after:-translate-x-1/2 data-[side=top]:after:border-t-border",
          "data-[side=bottom]:after:top-[calc(var(--arrow-offset-after)*-1)] data-[side=bottom]:after:left-1/2 data-[side=bottom]:after:-translate-x-1/2 data-[side=bottom]:after:border-b-border",
          "data-[side=left]:after:right-[calc(var(--arrow-offset-after)*-1)] data-[side=left]:after:top-1/2 data-[side=left]:after:-translate-y-1/2 data-[side=left]:after:border-l-border",
          "data-[side=right]:after:left-[calc(var(--arrow-offset-after)*-1)] data-[side=right]:after:top-1/2 data-[side=right]:after:-translate-y-1/2 data-[side=right]:after:border-r-border",
          arrowClassName
        ],
      className
    )}
    {...props}
  />
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

