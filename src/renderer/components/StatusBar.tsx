import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

// Icon name mapping for StatusBar
const iconNameMap: Record<string, keyof typeof Icons> = {
  "RulerIcon": "Ruler",
  "Ruler": "Ruler",
  "Grid3x3": "Grid3x3",
  "Box": "Box",
  "Pencil": "Pencil",
  "Move": "Move",
  "RotateCw": "RotateCw",
  // Measurement icons from RibbonMenu
  "Spline": "Spline", // Distance
  "VectorSquare": "VectorSquare", // Area
  "Tangent": "Tangent", // Angle
  "RulerDimensionLine": "RulerDimensionLine", // Height
  "Circle": "Circle", // Point
};

function StatusBar() {
  const coordinates = useSelector((state: RootState) => state.statusBarReducer.coordinates);
  const operation = useSelector((state: RootState) => state.statusBarReducer.operation);
  
  // Get icon component if icon name is provided
  let IconComponent: LucideIcon | null = null;
  if (operation.icon) {
    const iconKey = iconNameMap[operation.icon] || operation.icon;
    IconComponent = (Icons[iconKey as keyof typeof Icons] as LucideIcon) || null;
  }

  return (
    <div className="h-5 text-xs border-t border-border text-foreground flex items-center justify-between px-4 text-sm select-none">
        <div className="flex items-center gap-1.5">
          {IconComponent && (
            <IconComponent 
              className="h-3 w-3" 
              style={operation.icon === "RulerDimensionLine" ? { transform: "rotate(90deg)" } : undefined}
            />
          )}
          <span>{operation.name}</span>
        </div>
        <div>{coordinates.x != 0 ? `${coordinates.x}, ${coordinates.y}, ${coordinates.z}` : ""}</div>
    </div>
  )
}

export default StatusBar