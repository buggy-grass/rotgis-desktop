import * as React from "react"
import { cn } from "../../lib/utils"
import { LucideIcon } from "lucide-react"

type TabsOrientation = "horizontal" | "vertical"
type TabsSize = "sm" | "md" | "lg"

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  orientation: TabsOrientation
  size: TabsSize
}>({
  value: "",
  onValueChange: () => {},
  orientation: "horizontal",
  size: "md",
})

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
    orientation?: TabsOrientation
    size?: TabsSize
  }
>(({ className, defaultValue, value, onValueChange, orientation = "horizontal", size = "md", children, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || "")
  const currentValue = value !== undefined ? value : internalValue

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, orientation, size }}>
      <div
        ref={ref}
        className={cn(
          "w-full",
          orientation === "vertical" && "flex flex-row items-start gap-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation, size } = React.useContext(TabsContext)
  
  const sizeClasses = {
    sm: orientation === "horizontal" ? "h-5 p-1" : "w-20 p-1",
    md: orientation === "horizontal" ? "h-6 p-2" : "w-24 p-2",
    lg: orientation === "horizontal" ? "h-8 p-3" : "w-28 p-3",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "items-center justify-center rounded-md bg-muted text-muted-foreground",
        orientation === "horizontal" ? "inline-flex flex-row" : "flex flex-col",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
    icon?: LucideIcon
    iconPosition?: "left" | "right"
    iconClassName?: string
  }
>(({ className, value, icon: Icon, iconPosition = "left", iconClassName, children, ...props }, ref) => {
  const { value: currentValue, onValueChange, orientation, size } = React.useContext(TabsContext)
  const isActive = currentValue === value

  const sizeClasses = {
    sm: {
      padding: orientation === "horizontal" ? "px-2 py-1" : "px-1 py-2",
      text: "text-xs",
      iconClass: "w-[1em] h-[1em]",
    },
    md: {
      padding: orientation === "horizontal" ? "px-3 py-1.5" : "px-1.5 py-3",
      text: "text-sm",
      iconClass: "w-[1em] h-[1em]",
    },
    lg: {
      padding: orientation === "horizontal" ? "px-4 py-2" : "px-2 py-4",
      text: "text-base",
      iconClass: "w-[1em] h-[1em]",
    },
  }

  const getBorderRadius = () => {
    if (orientation === "horizontal") {
      return {
        borderBottomLeftRadius: isActive ? "0" : "4px",
        borderBottomRightRadius: isActive ? "0" : "4px",
      }
    } else {
      return {
        borderTopRightRadius: isActive ? "0" : "4px",
        borderBottomRightRadius: isActive ? "0" : "4px",
      }
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5",
        orientation === "vertical" && "w-full",
        sizeClasses[size].padding,
        sizeClasses[size].text,
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/50",
        className
      )}
      style={{
        ...getBorderRadius(),
        position: "relative",
        zIndex: isActive ? 1 : 0,
      }}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {Icon && iconPosition === "left" && (
        <Icon className={cn("flex-shrink-0", sizeClasses[size].iconClass, iconClassName)} />
      )}
      {children}
      {Icon && iconPosition === "right" && (
        <Icon className={cn("flex-shrink-0", sizeClasses[size].iconClass, iconClassName)} />
      )}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
  }
>(({ className, value, ...props }, ref) => {
  const { value: currentValue, orientation } = React.useContext(TabsContext)
  
  if (currentValue !== value) {
    return null
  }

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn(
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        orientation === "horizontal" ? "mt-2" : "ml-2",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }

