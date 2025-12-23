import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { LucideIcon } from "lucide-react"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        borderless: "bg-transparent border-0 shadow-none hover:bg-accent/50",
        naked: "bg-transparent border-0 shadow-none p-0 hover:opacity-80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  icon?: LucideIcon
  iconPosition?: "left" | "right"
  iconClassName?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, icon: Icon, iconPosition = "left", iconClassName, children, ...props }, ref) => {
    // Icon boyutu size'a göre ayarla (minimum boyut garantisi)
    const iconSizeClass = size === "sm" ? "w-4 h-4 min-w-[16px] min-h-[16px]" : size === "lg" ? "w-5 h-5 min-w-[20px] min-h-[20px]" : "w-4 h-4 min-w-[16px] min-h-[16px]"
    
    // Icon render et
    const iconElement = Icon ? (
      <Icon className={cn(iconSizeClass, "flex-shrink-0", iconClassName)} />
    ) : null
    
    // asChild kullanıldığında Slot kullan, icon'ları children'a ekle
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }), Icon && "gap-2")}
          ref={ref}
          {...props}
        >
          {iconPosition === "left" && iconElement}
          {children}
          {iconPosition === "right" && iconElement}
        </Slot>
      )
    }
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }), Icon && "gap-2")}
        ref={ref}
        {...props}
      >
        {iconPosition === "left" && iconElement}
        {children}
        {iconPosition === "right" && iconElement}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

