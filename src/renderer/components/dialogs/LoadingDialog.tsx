import React from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Progress } from "../ui/progress";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { Loader2 } from "lucide-react";

export function LoadingDialog() {
  const isLoading = useSelector(
    (state: RootState) => state.appReducer.isLoading
  );
  const loadingProgress = useSelector(
    (state: RootState) => state.appReducer.loadingProgress
  );

  return (
    <Dialog open={isLoading} onOpenChange={() => {}}>
      <DialogContent
        title="Processing"
        showCloseButton={false}
        className="max-w-md"
        style={{
          zIndex: 99999,
          background: "#1e1e1e",
          border: "1px solid #404040",
          borderRadius: "0",
        }}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Progress Bar */}
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#e5e5e5] overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                {loadingProgress.message || "Processing..."}
              </span>
              <span className="text-[#a3a3a3]">
                {loadingProgress.percentage}%
              </span>
            </div>
            <Progress
              value={loadingProgress.percentage}
              className="h-2"
              style={{
                backgroundColor: "#2a2a2a",
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
