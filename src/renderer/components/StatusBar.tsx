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
    <div className="flex gap-1 items-center group">
      <span className="text-muted-foreground/70 font-bold text-[11px]" style={{marginTop:"3px"}}>{label}</span>
      <span 
        key={formattedValue} // Her değişimde tarayıcıya küçük bir yenileme sinyali gönderir
        className={`${label == "Z" ? "min-w-[50px]" : "min-w-[75px]"} text-[12px] font-mono tabular-nums text-foreground/90 transition-all duration-150 ease-out animate-in fade-in zoom-in-95 duration-200`}
        style={{marginTop:"1px"}}
      >
        {formattedValue}
      </span>
    </div>
  );
});

const PointCloudDisplay = memo(({ id, name, epsg }: { id: string,name: string, epsg: string }) => {
  return (
    <div className="flex gap-1 items-center group">
      <span 
        key={id} // Her değişimde tarayıcıya küçük bir yenileme sinyali gönderir
        className={`min-w-[50px] text-[12px] font-mono tabular-nums text-foreground/90 transition-all duration-150 ease-out animate-in fade-in zoom-in-95 duration-200`}
        style={{marginTop:"1px"}}
      >
        {name + ", " + `${epsg},`}
      </span>
    </div>
  );
});

CoordinateDisplay.displayName = "CoordinateDisplay";
PointCloudDisplay.displayName = "PointCloudDisplay";

const StatusBar = memo(function StatusBar() {
  const pointCloudData = useSelector((state: RootState) => state.statusBarReducer.modelData);
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
      <div className="flex items-center gap-2" style={{marginTop:"-7px"}}>
        {IconComponent && (
          <IconComponent 
            className="h-3 w-3 text-primary/80 font-medium" 
            style={operation.icon === "RulerDimensionLine" ? { transform: "rotate(90deg)", color: "white" } : undefined}
            color="white"
          />
        )}
        <span className="font-medium text-muted-foreground tracking-tight">{operation.name || "Hazır"}</span>
      </div>

      {/* Sağ Kısım */}
      <div className="flex items-center border-l pl-4 border-border/50" style={{justifyContent: "space-evenly"}}>
        {hasCoordinates ? (
          <div className="flex" style={{display:"flex", justifyContent:"space-between",marginTop:"-7px", gap: "5px"}}>
            <PointCloudDisplay id={pointCloudData.id} name={pointCloudData.name} epsg={pointCloudData.epsg}></PointCloudDisplay>
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