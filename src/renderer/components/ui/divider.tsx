import * as React from "react"
import { cn } from "../../lib/utils"

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical"
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => {
    if (orientation === "vertical") {
      return (
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={cn("w-px h-full bg-border", className)}
          {...props}
        />
      )
    }
    
    return (
      <hr
        ref={ref}
        className={cn("border-0 border-t border-border", className)}
        {...props}
      />
    )
  }
)
Divider.displayName = "Divider"

export { Divider }

