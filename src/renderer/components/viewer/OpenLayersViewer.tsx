import React, { useEffect, useRef } from "react";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import "ol/ol.css";

interface OpenLayersViewerProps {
  display: string;
}

/**
 * OpenLayersViewer component - Dronet projesindeki OrthophotoPage/DroNetCogViewer yapısına benzer
 * Display prop ile kontrol edilir, display: none olduğunda DOM'da kalır ama görünmez
 */
const OpenLayersViewer: React.FC<OpenLayersViewerProps> = ({ display }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    // Only create map if display is block and map doesn't exist
    if (!mapRef.current || mapInstanceRef.current || display !== "block") {
      return;
    }

    // Create OpenLayers map
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [display]);

  // Update map size when display changes to block
  useEffect(() => {
    if (mapInstanceRef.current && display === "block") {
      setTimeout(() => {
        mapInstanceRef.current?.updateSize();
      }, 100);
    }
  }, [display]);

  // display: none yerine visibility ve opacity kullan (WebGL context kaybını önlemek için)
  const isVisible = display === "block";

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        visibility: isVisible ? "visible" : "hidden",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        backgroundColor: "#000000",
        position: "absolute",
        top: 0,
        left: 0,
        transition: "opacity 0.2s",
      }}
    />
  );
};

export default OpenLayersViewer;

