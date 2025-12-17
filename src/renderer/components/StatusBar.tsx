import { useSelector } from "react-redux";
import { RootState } from "../store/store";

function StatusBar() {
  const coordinates = useSelector((state: RootState) => state.statusBarReducer.coordinates);
  return (
    <div className="h-5 text-xs border-t border-border text-foreground flex items-center justify-between px-4 text-sm select-none">
        <div>operation</div>
        <div>{coordinates.x != 0 ? `${coordinates.x}, ${coordinates.y}, ${coordinates.z}` : ""}</div>
    </div>
  )
}

export default StatusBar