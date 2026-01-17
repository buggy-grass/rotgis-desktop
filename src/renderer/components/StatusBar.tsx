import React, { memo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

const iconNameMap: Record<string, keyof typeof Icons> = {
  "RulerIcon": "Ruler", "Ruler": "Ruler", "Grid3x3": "Grid3x3",
  "Box": "Box", "Pencil": "Pencil", "Move": "Move",
  "RotateCw": "RotateCw", "Spline": "Spline",
  "VectorSquare": "VectorSquare", "Tangent": "Tangent",
  "RulerDimensionLine": "RulerDimensionLine", "Circle": "Circle",
};

// CSS Geçişli Koordinat Bileşeni
const CoordinateDisplay = memo(({ label, value }: { label: string, value: number }) => {
  const formattedValue = value.toFixed(3);

  return (
    <div className="flex gap-1.5 items-center group">
      <span className="text-muted-foreground/70 font-bold text-[10px]">{label}</span>
      <span 
        key={formattedValue} // Her değişimde tarayıcıya küçük bir yenileme sinyali gönderir
        className="min-w-[75px] font-mono tabular-nums text-foreground/90 transition-all duration-150 ease-out animate-in fade-in zoom-in-95 duration-200"
      >
        {formattedValue}
      </span>
    </div>
  );
});

CoordinateDisplay.displayName = "CoordinateDisplay";

const StatusBar = memo(function StatusBar() {
  const coordinates = useSelector((state: RootState) => state.statusBarReducer.coordinates);
  const operation = useSelector((state: RootState) => state.statusBarReducer.operation);

  let IconComponent: LucideIcon | null = null;
  if (operation.icon) {
    const iconKey = iconNameMap[operation.icon] || operation.icon;
    IconComponent = (Icons[iconKey as keyof typeof Icons] as LucideIcon) || null;
  }

  const hasCoordinates = coordinates.x !== 0 || coordinates.y !== 0 || coordinates.z !== 0;

  return (
    <div className="h-6 text-[11px] border-t border-border bg-background/80 backdrop-blur-md text-foreground flex items-center justify-between px-4 select-none">
      {/* Sol Kısım */}
      <div className="flex items-center gap-2">
        {IconComponent && (
          <IconComponent 
            className="h-3 w-3 text-primary/80" 
            style={operation.icon === "RulerDimensionLine" ? { transform: "rotate(90deg)" } : undefined}
          />
        )}
        <span className="font-medium text-muted-foreground tracking-tight">{operation.name || "Hazır"}</span>
      </div>

      {/* Sağ Kısım */}
      <div className="flex items-center gap-5 border-l pl-4 border-border/50 h-full">
        {hasCoordinates ? (
          <div className="flex gap-4">
            <CoordinateDisplay label="X" value={coordinates.x} />
            <CoordinateDisplay label="Y" value={coordinates.y} />
            <CoordinateDisplay label="Z" value={coordinates.z} />
          </div>
        ) : ""}
      </div>
    </div>
  );
});

export default StatusBar;