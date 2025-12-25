import React, { useState, useEffect, useRef } from "react";
import PotreeViewer from "./PotreeViewer";
import OpenLayersViewer from "./OpenLayersViewer";
import { Button } from "../ui/button";
import { Box, Columns2, LayoutGrid, Split, SquareSplitHorizontal } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../ui/resizable";

type ViewMode = "3d" | "2d" | "split-horizontal";

interface ViewerProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

/**
 * Viewer component
 * 3D ve 2D viewer'ları aynı anda render eder, visibility ve opacity ile kontrol edilir
 * display: none kullanılmaz çünkü WebGL context kaybına neden olur
 * Split horizontal modunda 3D ve 2D yan yana görünür
 */
const Viewer: React.FC<ViewerProps> = ({
  viewMode: externalViewMode,
  onViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("3d");
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Visibility ve opacity değerleri - display: none yerine
  const is3DVisible = viewMode === "3d" || viewMode === "split-horizontal";
  const is2DVisible = viewMode === "2d" || viewMode === "split-horizontal";

  // Split modunda panel boyutlarını takip et ve viewer'ları güncelle
  const potreePanelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (viewMode === "split-horizontal" && potreePanelRef.current) {
      let resizeTimeout: NodeJS.Timeout;
      
      // Potree panel'i için ResizeObserver - canvas boyutunu güncelle
      const potreeResizeObserver = new ResizeObserver((entries) => {
        // Debounce - çok sık güncelleme yapmayı önle
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            // Minimum boyut kontrolü - canvas 0x0 olmamalı
            if (width >= 200 && height >= 200 && window.viewer && window.viewer.renderer) {
              const canvas = window.viewer.renderer.domElement;
              if (canvas) {
                // Canvas'ın gerçek boyutunu al
                const rect = canvas.getBoundingClientRect();
                const actualWidth = Math.floor(rect.width);
                const actualHeight = Math.floor(rect.height);
                
                // Sadece geçerli boyutlarda güncelle
                if (actualWidth >= 200 && actualHeight >= 200) {
                  // Mevcut boyutla aynı değilse güncelle
                  if (window.viewer.renderer.getSize().width !== actualWidth || 
                      window.viewer.renderer.getSize().height !== actualHeight) {
                    window.viewer.renderer.setSize(actualWidth, actualHeight, false);
                    window.viewer.update();
                  }
                }
              }
            }
          }
        }, 150); // 150ms debounce
      });

      potreeResizeObserver.observe(potreePanelRef.current);

      // window.viewer.renderer.forceContextLoss();
      return () => {
        clearTimeout(resizeTimeout);
        potreeResizeObserver.disconnect();
      };
    }
    return undefined;
  }, [viewMode]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Viewer Window Bar - WindowCustomBar benzeri */}
      <div
        className="bg-background border-b border-border flex items-center justify-between select-none"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          zIndex: 100, // En üstte olmalı
          top: 0,
          left: 0,
          right: 0,
          pointerEvents: "auto", // Butonlar çalışmalı
          height: "32px",
          
        }}
      >
        {/* Sol taraf - Viewer Mode butonları */}
        <div className="flex items-center" style={{display:"flex", justifyContent: "flex-end", width: "100%",}}>
          <div className="flex items-center gap-2 mr-2">
            <Button
              variant={viewMode === "3d" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleViewModeChange("3d")}
            >
              <span>3D</span>
            </Button>
            <Button
              variant={viewMode === "2d" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleViewModeChange("2d")}
            >
              <span>2D</span>
            </Button>
            <Button
              variant={viewMode === "split-horizontal" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-s"
              onClick={() => handleViewModeChange("split-horizontal")}
            >
              <Columns2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Viewer Container - Bar'ın altında */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          paddingTop: "32px", // Bar yüksekliği - viewer'lar bar'ın altında başlamalı
        }}
      >

        {/* 3D Viewer - Her zaman render edilir, CSS ile pozisyon ve görünürlük kontrol edilir */}
        <div
          ref={potreePanelRef}
          style={{
            position: "absolute",
            top: 0,
            left: viewMode === "split-horizontal" ? 0 : 0,
            width: viewMode === "split-horizontal" ? "50%" : "100%",
            height: "100%",
            visibility: is3DVisible ? "visible" : "hidden",
            opacity: is3DVisible ? 1 : 0,
            pointerEvents: is3DVisible ? "auto" : "none", // Sadece görünürken pointer events aktif
            transition: "opacity 0.4s ease-in-out",
            minWidth: "200px",
            minHeight: "200px",
            zIndex: 1, // Viewer'lar en altta
          }}
        >
          <PotreeViewer display="block" />
        </div>

        {/* 2D Viewer - Her zaman render edilir, CSS ile pozisyon ve görünürlük kontrol edilir */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: viewMode === "split-horizontal" ? "50%" : 0,
            width: viewMode === "split-horizontal" ? "50%" : "100%",
            height: "100%",
            visibility: is2DVisible ? "visible" : "hidden",
            opacity: is2DVisible ? 1 : 0,
            pointerEvents: is2DVisible ? "auto" : "none",
            display: is3DVisible ? viewMode == "split-horizontal" ? "block" : "none" : "block",
            transition: "opacity 0.4s ease-in-out",
            minWidth: "200px",
            minHeight: "200px",
            zIndex: 1, // Viewer'lar en altta
          }}
        >
          <OpenLayersViewer display="block" />
        </div>

        {viewMode === "split-horizontal" && (
          <ResizablePanelGroup
            direction="horizontal"
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none", // Panel group viewer'ları engellemesin
              zIndex: 10, // Handle viewer'ların üstünde olmalı
            }}
          >
            <ResizablePanel defaultSize={50} minSize={20}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none", // Panel viewer'ları engellemesin
                }}
              />
            </ResizablePanel>
            <ResizableHandle 
              withHandle 
              style={{ 
                pointerEvents: "auto", // Handle çalışmalı
                zIndex: 20, // Handle en üstte
                position: "relative", // Handle'ın doğru çalışması için
              }} 
            />
            <ResizablePanel defaultSize={50} minSize={20}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none", // Panel viewer'ları engellemesin
                }}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default Viewer;

