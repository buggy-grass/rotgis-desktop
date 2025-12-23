import * as React from "react"
import { cn } from "../../lib/utils"
import { LucideIcon } from "lucide-react"

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  icon?: LucideIcon
  iconPosition?: "left" | "right"
  iconClassName?: string
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, icon: Icon, iconPosition = "left", iconClassName, children, ...props }, ref) => {
    const iconSize = "0.875rem" // text-xs ile uyumlu
    
    return (
      <label
        ref={ref}
        className={cn(
          "text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 inline-flex items-center gap-0.5",
          className
        )}
        {...props}
      >
        {Icon && iconPosition === "left" && (
          <Icon className={cn("flex-shrink-0", iconClassName)} size={iconSize} />
        )}
        {children}
        {Icon && iconPosition === "right" && (
          <Icon className={cn("flex-shrink-0", iconClassName)} size={iconSize} />
        )}
      </label>
    )
  }
)
Label.displayName = "Label"

export { Label }

