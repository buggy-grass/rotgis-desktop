import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import WebGLTileLayer from "ol/layer/WebGLTile";
import OSM from "ol/source/OSM";
import GeoTIFF from "ol/source/GeoTIFF";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import { defaults as defaultControls } from "ol/control/defaults";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import OverviewMap from "ol/control/OverviewMap";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { get as getProjection } from "ol/proj";
import { transformExtent } from "ol/proj";
import Overlay from "ol/Overlay";
import type { Raster } from "../../types/ProjectTypes";
import type { RootState } from "../../store/store";
import "ol/ol.css";
import ProjectActions from "../../store/actions/ProjectActions";

// Register proj4 with OpenLayers: common UTM and NAD83 so reprojection never fails
proj4.defs("EPSG:32635", "+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs");
// WGS84 UTM northern (1N–60N) and southern (1S–60S)
for (let z = 1; z <= 60; z++) {
  const n = 32600 + z;
  const s = 32700 + z;
  proj4.defs(
    "EPSG:" + n,
    `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`,
  );
  proj4.defs(
    "EPSG:" + s,
    `+proj=utm +zone=${z} +south +datum=WGS84 +units=m +no_defs`,
  );
}
// NAD83 UTM 10N–23N (North America)
for (let z = 10; z <= 23; z++) {
  proj4.defs(
    "EPSG:" + (26900 + z),
    `+proj=utm +zone=${z} +datum=NAD83 +units=m +no_defs`,
  );
}
register(proj4);

interface OpenLayersViewerProps {
  display: string;
}

interface PotreeCameraZoom {
  fov: number;
  distance: number;
  screenHeight: number;
  x: number;
  y: number;
  yaw: number;
}

/** URL for raster (Dronet ile aynı: http://127.0.0.1:port/files/asset). Sadece HTTP; sunucu Range zorunlu. */
function getRasterUrl(
  fullPath: string,
  assetPath: string,
  rasterServerPort: number,
): string {
  if (rasterServerPort > 0) {
    const normalized = assetPath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `http://127.0.0.1:${rasterServerPort}/files/${normalized}`;
  }
  return `rotgis://raster/?path=${encodeURIComponent(fullPath)}`;
}

/** (z, x, y) tile koordinatından quadkey üretir; {quadkey} / {q} içeren XYZ base layer URL'leri için. */
function tileXYToQuadKey(x: number, y: number, zoom: number): string {
  let quadKey = "";
  for (let i = zoom; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((x & mask) !== 0) digit += 1;
    if ((y & mask) !== 0) digit += 2;
    quadKey += digit.toString();
  }
  return quadKey;
}

/** Get [minLon, minLat, maxLon, maxLat] from wgs84Extent coordinates[0] ring. */
function extentFromWgs84(wgs84Extent: {
  coordinates: number[][][];
}): [number, number, number, number] | null {
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
 * Donma önleme: movestart/moveend'de opaklık veya ağır iş yok; sadece moveend'de tek rAF ile hafif yenileme.
 */
const OpenLayersViewer: React.FC<OpenLayersViewerProps> = ({ display }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const overviewTargetRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const overviewMapRef = useRef<InstanceType<typeof OverviewMap> | null>(null);
  const syncMarkerOverlayRef = useRef<InstanceType<typeof Overlay> | null>(
    null,
  );
  const rasterLayersRef = useRef<WebGLTileLayer[]>([]);
  const moveEndRafRef = useRef<number | null>(null);
  const [rasterServerPort, setRasterServerPort] = useState(0);
  const modelData = useSelector(
    (state: RootState) => state.statusBarReducer.modelData,
  );

  const project = useSelector(
    (state: RootState) => state.projectReducer.project,
  );
  const projectFolderPath = useSelector(
    (state: RootState) => state.projectReducer.projectFolderPath,
  );
  const rasters: Raster[] = project?.metadata?.raster ?? [];
  const projectPath = projectFolderPath ?? project?.project?.path ?? "";
  const potreeZoom = useRef<PotreeCameraZoom | null>(null);
  const [potreeZoomState, setPotreeZoomState] =
    useState<PotreeCameraZoom | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.electronAPI?.getRasterServerPort
    ) {
      window.electronAPI.getRasterServerPort().then(setRasterServerPort);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || display !== "block") {
      return;
    }

    const osmSource = new OSM();
    const baseLayer = new TileLayer({
      source: osmSource,
      preload: 0,
    });
    baseLayer.set("id", "basemap");

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      controls: defaultControls({ zoom: false }),
      interactions: defaultInteractions({ mouseWheelZoom: false }).extend([
        new MouseWheelZoom({ duration: 0, constrainResolution: true }),
      ]),
      view: new View({
        projection: "EPSG:3857",
        center: [0, 0],
        zoom: 2,
        maxZoom: 24,
        constrainResolution: false,
        smoothExtentConstraint: false,
      }),
    });

    mapInstanceRef.current = map;

    const overviewEl = overviewTargetRef.current;
    if (overviewEl) {
      const overviewLayer = new TileLayer({
        source: osmSource,
        preload: 0,
      });
      const overviewControl = new OverviewMap({
        className: "ol-overviewmap rotgis-minimap",
        layers: [overviewLayer],
        target: overviewEl,
        collapsed: false,
        collapsible: false,
        tipLabel: "Mini harita",
      });
      map.addControl(overviewControl);
      overviewMapRef.current = overviewControl;
    }

    const syncMarkerEl = document.createElement("div");
    syncMarkerEl.className = "rotgis-sync-marker";
    syncMarkerEl.innerHTML = "<span>R</span>";
    syncMarkerEl.style.cssText =
      "width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,200,0,0.9); background: rgba(255,200,0,0.25); color: #fff; font-weight: bold; font-size: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.4);";
    syncMarkerEl.style.display = "none";
    syncMarkerEl.style.alignItems = "center";
    syncMarkerEl.style.justifyContent = "center";
    syncMarkerEl.style.flexDirection = "row";
    const syncOverlay = new Overlay({
      element: syncMarkerEl,
      positioning: "center-center",
      stopEvent: false,
    });
    map.addOverlay(syncOverlay);
    syncMarkerOverlayRef.current = syncOverlay;

    const onMoveEnd = () => {
      if (moveEndRafRef.current != null)
        cancelAnimationFrame(moveEndRafRef.current);
      moveEndRafRef.current = requestAnimationFrame(() => {
        moveEndRafRef.current = null;
        map.updateSize();
        map.render();
      });
    };

    map.on("moveend", onMoveEnd);

    return () => {
      if (moveEndRafRef.current != null)
        cancelAnimationFrame(moveEndRafRef.current);
      map.un("moveend", onMoveEnd);
      overviewMapRef.current = null;
      syncMarkerOverlayRef.current = null;
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

    if (rasters.length === 0) {
      rasterLayersRef.current.forEach((layer) => map.removeLayer(layer));
      rasterLayersRef.current = [];
      return;
    }

    // Raster sunucusunun proje yolunu her zaman güncelle (dosyalar doğru path'ten sunulsun)
    if (
      typeof window !== "undefined" &&
      window.electronAPI?.setRasterServerPath
    ) {
      window.electronAPI.setRasterServerPath(projectPath);
    }

    // Remove existing raster layers
    rasterLayersRef.current.forEach((layer) => map.removeLayer(layer));
    rasterLayersRef.current = [];

    const overview = overviewMapRef.current?.getOverviewMap();
    if (overview) {
      const ovLayers = overview.getLayers();
      const arr = ovLayers.getArray();
      const first = arr[0];
      ovLayers.clear();
      if (first) ovLayers.push(first);
    }

    const baseZIndex = 10;
    let combinedExtent: [number, number, number, number] | null = null;

    const projectRoot = projectPath.replace(/[/\\]+$/, "");
    rasters.forEach((raster, index) => {
      const relativePath = raster.cogPath || raster.asset;
      const pathForFull = relativePath || raster.path;
      if (!pathForFull) return;

      const isAbsolute =
        pathForFull.startsWith(projectRoot) ||
        pathForFull.startsWith("/") ||
        /^[A-Za-z]:[/\\]/.test(pathForFull);
      const fullPath = isAbsolute
        ? pathForFull
        : window.electronAPI.pathJoin(projectPath, pathForFull);
      let assetForUrl: string;
      if (relativePath) {
        assetForUrl = relativePath;
      } else if (pathForFull.startsWith(projectRoot)) {
        assetForUrl = pathForFull
          .slice(projectRoot.length)
          .replace(/^[/\\]+/, "");
      } else {
        assetForUrl = pathForFull.replace(/^[/\\]+/, "");
      }
      const normalizedAsset = assetForUrl
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
      const rasterUrl = getRasterUrl(
        fullPath,
        normalizedAsset,
        rasterServerPort,
      );

      try {
        const sourceEpsg = raster.epsg || "4326";
        const source = new GeoTIFF({
          sources: [{ url: rasterUrl, nodata: -9999, min: 0, max: 255 }],
          convertToRGB: "auto",
          projection: sourceEpsg.startsWith("EPSG:")
            ? sourceEpsg
            : `EPSG:${sourceEpsg}`,
          interpolate: false,
          wrapX: false,
          // transition: 0,
          sourceOptions: {
            maxRanges: 24,
            allowFullFile: false,
          },
        });
        const layer = new WebGLTileLayer({
          source,
          minZoom: 2,
          maxZoom: 24,
          preload: 0,
          opacity: 1,
          zIndex: baseZIndex + index,
        });

        const webTileLayerSource = layer.getSource();

        // 0 = IDLE
        // 1 = LOADING
        // 2 = LOADED
        // 3 = ERROR
        // 4 = EMPTY

        webTileLayerSource?.on("tileloaderror", (e: any) => {
          const tile = e.tile;

          if (tile) {
            tile.setState(0);
            tile.load();
          }
        });
        layer.set("name", "raster-" + raster.id);
        layer.set("rasterId", raster.id);
        layer.setVisible(true);
        map.addLayer(layer);
        rasterLayersRef.current.push(layer);

        const overview = overviewMapRef.current?.getOverviewMap();
        if (overview) {
          overview.getLayers().push(
            new WebGLTileLayer({
              source,
              minZoom: 2,
              maxZoom: 24,
              preload: 0,
              opacity: 0.9,
            }),
          );
        }

        const ext = extentFromWgs84(raster.wgs84Extent ?? { coordinates: [] });
        if (ext) {
          if (!combinedExtent) combinedExtent = [...ext];
          else {
            combinedExtent[0] = Math.min(combinedExtent[0], ext[0]);
            combinedExtent[1] = Math.min(combinedExtent[1], ext[1]);
            combinedExtent[2] = Math.max(combinedExtent[2], ext[2]);
            combinedExtent[3] = Math.max(combinedExtent[3], ext[3]);
          }
        }
      } catch (err) {
        console.warn(
          "OpenLayersViewer: could not add raster layer",
          raster.id,
          err,
        );
      }
    });

    // Tüm raster'ların birleşik extent'ine zoom (hepsi görünsün)
    if (combinedExtent) {
      const proj3857 = getProjection("EPSG:3857");
      if (proj3857) {
        const extent3857 = transformExtent(
          combinedExtent,
          "EPSG:4326",
          "EPSG:3857",
        );
        map
          .getView()
          .fit(extent3857, { padding: [40, 40, 40, 40], maxZoom: 18 });
      }
    }
  }, [projectPath, rasters, rasterServerPort]);

  // Listen for "focus to raster" extent (from LayerBox); rasterId ile hedeflenen katman yenilenir
  useEffect(() => {
    if (typeof window === "undefined" || !window.eventBus) return;
    const handler = (payload: {
      extent: [number, number, number, number];
      rasterId?: string;
    }) => {
      const map = mapInstanceRef.current;
      if (!map || !payload?.extent) return;
      const extent3857 = transformExtent(
        payload.extent,
        "EPSG:4326",
        "EPSG:3857",
      );
      map.getView().fit(extent3857, { padding: [40, 40, 40, 40], maxZoom: 18 });
      if (payload.rasterId) {
        requestAnimationFrame(() => {
          const layer = rasterLayersRef.current.find(
            (l) => l.get("rasterId") === payload.rasterId,
          );
          if (layer) {
            layer.setVisible(true);
            layer.changed();
            map.render();
          }
        });
      }
    };
    const zoom = (data: any) => {
      potreeZoom.current = {
        distance: data.distance,
        fov: data.fov,
        screenHeight: data.screenHeight,
        x: data.x,
        y: data.y,
        yaw: data.yaw
      };
      setPotreeZoomState({
        distance: data.distance,
        fov: data.fov,
        screenHeight: data.screenHeight,
        x: data.x,
        y: data.y,
        yaw: data.yaw
      });
    };
    window.eventBus.on("openlayers:fitExtent", handler);
    window.eventBus.on("cameraZoomChanged", zoom);
    return () => {
      window.eventBus.off("openlayers:fitExtent", handler);
      window.eventBus.off("cameraZoomChanged", zoom);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.eventBus) return;
    const handler = (payload: { rasterId: string; visible: boolean }) => {
      const map = mapInstanceRef.current;
      if (!map || !payload?.rasterId) return;
      const layer = rasterLayersRef.current.find(
        (l) => l.get("rasterId") === payload.rasterId,
      );
      if (layer) {
        layer.setVisible(payload.visible);
        map.render();
      }
    };
    window.eventBus.on("openlayers:rasterVisibility", handler);
    return () => {
      window.eventBus.off("openlayers:rasterVisibility", handler);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.eventBus) return;

    const handler = (payload: {
      x: number;
      y: number;
      z: number;
      epsg: number | string;
      proj4?: string;

      // 👇 yeni eklenenler
      fov?: number;
      distance?: number;
      screenHeight?: number;
    }) => {
      const map = mapInstanceRef.current;
      const overlay = syncMarkerOverlayRef.current;
      if (!map || !overlay || !payload) return;

      try {
        const currentPointCloud =
          ProjectActions.getProjectState().project?.metadata.pointCloud.find(
            (pc) => pc.id === modelData.id,
          );

        if (!currentPointCloud) return;

        const sourceEpsg =
          typeof currentPointCloud.epsg === "number"
            ? `${currentPointCloud.epsg}`
            : currentPointCloud.epsg;

        if (currentPointCloud.proj4 && !proj4.defs(sourceEpsg)) {
          proj4.defs(sourceEpsg, currentPointCloud.proj4);
        }

        const targetEpsg = map.getView().getProjection().getCode();

        const coord = proj4(sourceEpsg, targetEpsg, [payload.x, payload.y]) as [
          number,
          number,
        ];

        if (
          !coord ||
          !Number.isFinite(coord[0]) ||
          !Number.isFinite(coord[1])
        ) {
          return;
        }

        overlay.setPosition(coord);

        const el = overlay.getElement();
        if (el) (el as HTMLElement).style.display = "flex";

        // const view = map.getView();

        // let resolution: number | undefined;

        // if (
        //   potreeZoom.current?.fov &&
        //   potreeZoom.current.distance &&
        //   potreeZoom.current.screenHeight
        // ) {
        //   resolution =
        //     (2 *
        //       potreeZoom.current.distance *
        //       Math.tan((potreeZoom.current.fov * Math.PI) / 360)) /
        //     potreeZoom.current.screenHeight;
        // }

        // const currentResolution = view.getResolution();

        // const EPSILON = 1e-2; // biraz büyük tolerance

        // const zoomChanged =
        //   resolution &&
        //   currentResolution &&
        //   Math.abs(currentResolution - resolution) > EPSILON;

        // // 🔥 ÖNCE animasyonları durdur
        // view.cancelAnimations();

        // if (zoomChanged && resolution) {
        //   // zoom değişmiş → direkt set
        //   view.setResolution(resolution);
        // }

        // // center her zaman güncellenir
        // view.setCenter(coord);
      } catch (err) {
        console.warn("OpenLayersViewer: sync coordinate transform failed", err);
      }
    };

    window.eventBus.on("viewer:syncCoordinate", handler);

    return () => {
      window.eventBus.off("viewer:syncCoordinate", handler);
    };
  }, [modelData]);

  useEffect(() => {
    if (potreeZoomState) {
      const map = mapInstanceRef.current;
      const overlay = syncMarkerOverlayRef.current;
      if (!map || !overlay) return;
      try {
        const currentPointCloud =
          ProjectActions.getProjectState().project?.metadata.pointCloud.find(
            (pc) => pc.id === modelData.id,
          );

        if (!currentPointCloud) return;

        const sourceEpsg =
          typeof currentPointCloud.epsg === "number"
            ? `${currentPointCloud.epsg}`
            : currentPointCloud.epsg;

        if (currentPointCloud.proj4 && !proj4.defs(sourceEpsg)) {
          proj4.defs(sourceEpsg, currentPointCloud.proj4);
        }

        const targetEpsg = map.getView().getProjection().getCode();

        const coord = proj4(sourceEpsg, targetEpsg, [
          potreeZoomState.x,
          potreeZoomState.y,
        ]) as [number, number];

        if (
          !coord ||
          !Number.isFinite(coord[0]) ||
          !Number.isFinite(coord[1])
        ) {
          return;
        }

        // overlay.setPosition(coord);

        const el = overlay.getElement();
        if (el) (el as HTMLElement).style.display = "flex";

        const view = map.getView();

        let resolution: number | undefined;

        if (
          potreeZoomState?.fov &&
          potreeZoomState.distance &&
          potreeZoomState.screenHeight
        ) {
          resolution =
            (2 *
              potreeZoomState.distance *
              Math.tan((potreeZoomState.fov * Math.PI) / 360)) /
            potreeZoomState.screenHeight;
        }

        const currentResolution = view.getResolution();

        const EPSILON = 1e-2; // biraz büyük tolerance

        const zoomChanged =
          resolution &&
          currentResolution &&
          Math.abs(currentResolution - resolution) > EPSILON;

        // 🔥 ÖNCE animasyonları durdur
        view.cancelAnimations();

        if (zoomChanged && resolution) {
          const maxRes = view.getMaxResolution();
          const zoom = Math.log2(maxRes / resolution);

          view.setZoom(zoom);
        }

        if (potreeZoom.current && potreeZoom?.current.yaw !== undefined) {
          view.setRotation(-potreeZoom.current.yaw);
        }

        // center sadece ciddi fark varsa güncelle
        const currentCenter = view.getCenter();

        const CENTER_EPSILON = 0.01;

        if (
          !currentCenter ||
          Math.abs(currentCenter[0] - coord[0]) > CENTER_EPSILON ||
          Math.abs(currentCenter[1] - coord[1]) > CENTER_EPSILON
        ) {
          view.setCenter(coord);
        }
      } catch (err) {
        console.warn("OpenLayersViewer: sync coordinate transform failed", err);
      }
    }
  }, [potreeZoomState]);

  useEffect(() => {
    if (mapInstanceRef.current && display === "block") {
      setTimeout(() => mapInstanceRef.current?.updateSize(), 100);
    }
  }, [display]);

  // Konteyner boyutu değişince harita canvas'ını güncelle (kenar boşluklarını önler)
  useEffect(() => {
    const el = mapRef.current;
    const map = mapInstanceRef.current;
    if (!el || !map || display !== "block") return;
    let rafId: number | null = null;
    const ro = new ResizeObserver(() => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        map.updateSize();
        map.render();
      });
    });
    ro.observe(el);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [display]);

  const isVisible = display === "block";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <div
        ref={mapRef}
        className="rotgis-ol-map"
        style={{
          width: "100%",
          height: "100%",
          minWidth: "100%",
          minHeight: "100%",
          visibility: isVisible ? "visible" : "hidden",
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? "auto" : "none",
          backgroundColor: "#000000",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transition: "opacity 0.2s",
          willChange: "transform",
          transform: "translateZ(0)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      />
      <div
        ref={overviewTargetRef}
        className="rotgis-minimap-container"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 160,
          height: 160,
          zIndex: 1000,
          visibility: isVisible ? "visible" : "hidden",
          pointerEvents: isVisible ? "auto" : "none",
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          border: "2px solid rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
};

export default OpenLayersViewer;
