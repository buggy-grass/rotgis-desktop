// Project XML Type Definitions

export interface Project {
  id: string;
  version: string;
  name: string;
  path: string;
  created: string;
  projectFile?: string;
  outcoordsys: OutCoordSys;
}

export interface BBox {
  min: {
    x: number;
    y: number;
    z: number;
  };
  max: {
    x: number;
    y: number;
    z: number;
  };
}

export interface Center {
  x: number;
  y: number;
}

export interface Mesh {
  id: string;
  name: string;
  fileType: "mesh";
  extension: string;
  asset: string;
  bbox: BBox;
  center: Center;
  epsg: string;
  epsgText: string;
  proj4: string;
  path: string;
  import: boolean;
}

export interface DSM {
  exist: boolean;
  file: string;
  res: number;
}

export interface MeasurementLayer {
  id: string;
  name: string;
  type: "measurement";
  visible: boolean;
  extent: BBox;
  measurementType?: string; // e.g., "point", "line", "polygon", "area", "volume"
  pointCloudId: string; // Ait olduğu point cloud ID'si
  points?: number[][]; // Measurement points as [x, y, z] arrays
  showDistances?: boolean;
  showArea?: boolean;
  showCoordinates?: boolean;
  closed?: boolean;
  showAngles?: boolean;
  showHeight?: boolean;
  showCircle?: boolean;
  showAzimuth?: boolean;
  showEdges?: boolean;
  color?: number[]; // [r, g, b] color array
  icon?: string; // Icon path
}

export interface AnnotationLayer {
  id: string;
  name: string;
  type: "annotation";
  visible: boolean;
  pointCloudId: string;
  /** Başlık (annotation başlığı) */
  title: string;
  /** İçerik (açıklama) */
  content: string;
  /** Konum [x, y, z] */
  position: [number, number, number];
  extent: BBox; // min/max aynı nokta veya küçük bbox (tooltip için)
}

export interface PointCloud {
  id: string;
  name: string;
  fileType: "pc";
  extension: string;
  asset: string;
  bbox: BBox;
  center: Center;
  epsg: string;
  epsgText: string;
  proj4: string;
  path: string;
  import: boolean;
  numberOfPoints: number;
  dsm: DSM;
  visible?: boolean; // Default: true if not specified
  layers?: (MeasurementLayer | AnnotationLayer)[]; // Measurement ve annotation katmanları
}

export interface Orthophoto {
  id: string;
  name: string;
  fileType: "orthophoto";
  extension: string;
  asset: string;
  cog: string;
  center: Center;
  epsg: string;
  epsgText: string;
  proj4: string;
  path: string;
  cogPath: string;
  import: boolean;
}

/** Band info from GDAL (gdalinfo -json) */
export interface RasterBandInfo {
  band: number;
  type?: string;
  block?: number[];
}

export interface Raster {
  id: string;
  name: string;
  fileType: "raster";
  extension: string;
  asset: string;
  path: string;
  bbox: BBox;
  center: Center;
  epsg: string;
  epsgText: string;
  proj4: string;
  width: number;
  height: number;
  bands: RasterBandInfo[];
  import: boolean;
  /** COG output path relative to project (if converted) */
  cogPath?: string;
  /** WGS84 extent from gdalinfo (for map zoom); coordinates[0] = polygon ring [lon,lat][] */
  wgs84Extent?: { type: string; coordinates: number[][][] };
}

export interface Metadata {
  mesh: Mesh[];
  pointCloud: PointCloud[];
  orthophoto: Orthophoto[];
  raster: Raster[];
  dsm: Orthophoto[];
  dtm: Orthophoto[];
}

export interface Asset {
  author: string;
  user_id: string;
  creationtime: number;
  modifiedtime: number;
  revision: number;
}

export interface Option {
  name: string;
  value: string | number | boolean;
}

export interface EPSG {
  code: number;
  proj: string;
}

export interface OutCoordSys {
  epsg: EPSG;
}

export interface ProjectXML {
  project: Project;
  metadata: Metadata;
}

