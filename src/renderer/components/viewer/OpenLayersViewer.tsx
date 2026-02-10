import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import WebGLTileLayer from "ol/layer/WebGLTile";
import OSM from "ol/source/OSM";
import GeoTIFF from "ol/source/GeoTIFF";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { get as getProjection } from "ol/proj";
import { transformExtent } from "ol/proj";
import type { Raster } from "../../types/ProjectTypes";
import type { RootState } from "../../store/store";
import "ol/ol.css";

// Register proj4 with OpenLayers: common UTM and NAD83 so reprojection never fails
proj4.defs(
  "EPSG:32635",
  "+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs"
);
// WGS84 UTM northern (1N–60N) and southern (1S–60S)
for (let z = 1; z <= 60; z++) {
  const n = 32600 + z;
  const s = 32700 + z;
  proj4.defs("EPSG:" + n, `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`);
  proj4.defs("EPSG:" + s, `+proj=utm +zone=${z} +south +datum=WGS84 +units=m +no_defs`);
}
// NAD83 UTM 10N–23N (North America)
for (let z = 10; z <= 23; z++) {
  proj4.defs("EPSG:" + (26900 + z), `+proj=utm +zone=${z} +datum=NAD83 +units=m +no_defs`);
}
register(proj4);

interface OpenLayersViewerProps {
  display: string;
}

/** URL for raster: prefer HTTP (local server with Range) for better COG performance; fallback rotgis. */
function getRasterUrl(fullPath: string, assetPath: string, rasterServerPort: number): string {
  if (rasterServerPort > 0) {
    const normalized = assetPath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `http://127.0.0.1:${rasterServerPort}/files/${normalized}`;
  }
  return `rotgis://raster/?path=${encodeURIComponent(fullPath)}`;
}

/** Get [minLon, minLat, maxLon, maxLat] from wgs84Extent coordinates[0] ring. */
function extentFromWgs84(wgs84Extent: { coordinates: number[][][] }): [number, number, number, number] | null {
  const ring = wgs84Extent?.coordinates?.[0];
  if (!ring || !ring.length) return null;
  let minLon = ring[0][0];
  let minLat = ring[0][1];
  let maxLon = ring[0][0];
  let maxLat = ring[0][1];
  for (let i = 1; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}

/**
 * OpenLayersViewer - OSM base map + raster layers from project.metadata.raster
 */
const OpenLayersViewer: React.FC<OpenLayersViewerProps> = ({ display }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const rasterLayersRef = useRef<WebGLTileLayer[]>([]);
  const [rasterServerPort, setRasterServerPort] = useState(0);

  const project = useSelector(
    (state: RootState) => state.projectReducer.project
  );
  const rasters: Raster[] = project?.metadata?.raster ?? [];
  const projectPath = project?.project?.path ?? "";

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI?.getRasterServerPort) {
      window.electronAPI.getRasterServerPort().then(setRasterServerPort);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || display !== "block") {
      return;
    }

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      interactions: defaultInteractions({ mouseWheelZoom: false }).extend([
        new MouseWheelZoom({ duration: 0, constrainResolution: true }),
      ]),
      view: new View({
        projection: "EPSG:3857",
        center: [0, 0],
        zoom: 2,
        maxZoom: 24,
        constrainResolution: true,
        smoothExtentConstraint: false,
      }),
    });

    mapInstanceRef.current = map;

    return () => {
      rasterLayersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [display]);

  // Add/remove raster layers when project rasters or path change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !projectPath) return;

    // Remove existing raster layers
    rasterLayersRef.current.forEach((layer) => map.removeLayer(layer));
    rasterLayersRef.current = [];

    if (rasters.length === 0) return;

    rasters.forEach((raster) => {
      const assetPath = raster.cogPath || raster.asset;
      if (!assetPath) return;

      const fullPath = window.electronAPI.pathJoin(projectPath, assetPath);
      const rasterUrl = getRasterUrl(fullPath, assetPath, rasterServerPort);

      try {
        const sourceEpsg = raster.epsg || "4326";
        const source = new GeoTIFF({
          sources: [{ url: rasterUrl }],
          convertToRGB: "auto",
          projection: sourceEpsg.startsWith("EPSG:") ? sourceEpsg : `EPSG:${sourceEpsg}`,
          interpolate: false,
          wrapX: false,
          transition: 0,
          sourceOptions: {
            cacheSize: 500,
            blockSize: 65536,
            maxRanges: 50,
            allowFullFile: false,
          },
        });
        const layer = new WebGLTileLayer({
          source,
          minZoom: 2,
          maxZoom: 24,
        });
        layer.set("name", "raster-" + raster.id);
        map.addLayer(layer);
        rasterLayersRef.current.push(layer);
      } catch (err) {
        console.warn("OpenLayersViewer: could not add raster layer", raster.id, err);
      }
    });

    // Zoom to first raster extent (WGS84) if available
    const firstWithExtent = rasters.find((r) => r.wgs84Extent?.coordinates?.length);
    if (firstWithExtent?.wgs84Extent) {
      const wgs84Extent = extentFromWgs84(firstWithExtent.wgs84Extent);
      if (wgs84Extent) {
        const proj3857 = getProjection("EPSG:3857");
        if (proj3857) {
          const extent3857 = transformExtent(wgs84Extent, "EPSG:4326", "EPSG:3857");
          map.getView().fit(extent3857, { padding: [40, 40, 40, 40], maxZoom: 18 });
        }
      }
    }
  }, [projectPath, rasters, rasterServerPort]);

  // Listen for "focus to raster" extent (from ToolBox)
  useEffect(() => {
    if (typeof window === "undefined" || !window.eventBus) return;
    const handler = (payload: { extent: [number, number, number, number] }) => {
      const map = mapInstanceRef.current;
      if (!map || !payload?.extent) return;
      const extent3857 = transformExtent(payload.extent, "EPSG:4326", "EPSG:3857");
      map.getView().fit(extent3857, { padding: [40, 40, 40, 40], maxZoom: 18 });
    };
    window.eventBus.on("openlayers:fitExtent", handler);
    return () => {
      window.eventBus.off("openlayers:fitExtent", handler);
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && display === "block") {
      setTimeout(() => mapInstanceRef.current?.updateSize(), 100);
    }
  }, [display]);

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
