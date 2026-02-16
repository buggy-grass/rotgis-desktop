import ProjectActions from "../store/actions/ProjectActions";
import PathService from "./PathService";
import ShellCommandService from "./ShellCommandService";
import WindowsAPI from "./WindowsAPI";
import { v4 as uuid } from "uuid";
import type {
  Raster,
  RasterBandInfo,
  BBox,
  Center,
} from "../types/ProjectTypes";

/** GDAL gdalinfo -json output (subset we use); cornerCoordinates can be [x,y] or {x,y} */
interface GdalInfoJson {
  size?: number[];
  cornerCoordinates?: {
    upperLeft?: { x: number; y: number } | number[];
    lowerLeft?: { x: number; y: number } | number[];
    upperRight?: { x: number; y: number } | number[];
    lowerRight?: { x: number; y: number } | number[];
    center?: { x: number; y: number } | number[];
  };
  bands?: Array<{ band?: number; type?: string; block?: number[] }>;
  coordinateSystem?: { wkt?: string };
  wgs84Extent?: { type: string; coordinates: number[][][] };
  stac?: { "proj:epsg"?: number };
}

class RasterService {
  private static importingFiles = new Set<string>();

  /**
   * Get extent (bbox) and band list from gdalinfo -json output.
   */
  private static parseGdalInfo(info: GdalInfoJson): {
    bbox: BBox;
    center: Center;
    bands: RasterBandInfo[];
    wgs84Extent?: { type: string; coordinates: number[][][] };
  } {
    const bbox: BBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
    const coords = info.cornerCoordinates;
    const toX = (
      v: { x?: number; y?: number } | number[] | undefined,
    ): number | undefined =>
      v == null ? undefined : Array.isArray(v) ? v[0] : v.x;
    const toY = (
      v: { x?: number; y?: number } | number[] | undefined,
    ): number | undefined =>
      v == null ? undefined : Array.isArray(v) ? v[1] : v.y;
    if (coords) {
      const xs = [
        toX(coords.upperLeft),
        toX(coords.lowerLeft),
        toX(coords.upperRight),
        toX(coords.lowerRight),
      ].filter((n) => typeof n === "number") as number[];
      const ys = [
        toY(coords.upperLeft),
        toY(coords.lowerLeft),
        toY(coords.upperRight),
        toY(coords.lowerRight),
      ].filter((n) => typeof n === "number") as number[];
      if (xs.length && ys.length) {
        bbox.min.x = Math.min(...xs);
        bbox.min.y = Math.min(...ys);
        bbox.max.x = Math.max(...xs);
        bbox.max.y = Math.max(...ys);
      }
    }
    const center: Center = {
      x: (bbox.min.x + bbox.max.x) / 2,
      y: (bbox.min.y + bbox.max.y) / 2,
    };
    const bands: RasterBandInfo[] = (info.bands || [])
      .map((b) => ({
        band: b.band ?? 0,
        type: b.type,
        block: b.block,
      }))
      .filter((b) => b.band >= 0);
    if (bands.length === 0) bands.push({ band: 1, type: "Unknown" });
    const wgs84Extent =
      info.wgs84Extent && typeof info.wgs84Extent === "object"
        ? info.wgs84Extent
        : undefined;
    return { bbox, center, bands, wgs84Extent };
  }

  /**
   * Import raster file: copy to project, run gdalinfo via launcher.bat for extent/bands,
   * optionally convert to COG, then add raster metadata to project (and project file).
   */
  static async import(filePath: string) {
    if (this.importingFiles.has(filePath)) {
      console.warn(`Raster ${filePath} is already being imported`);
      return;
    }
    this.importingFiles.add(filePath);

    try {
      const fileName =
        filePath.replace(/^.*[\\/]/, "").replace(/\.[^/.]+$/, "") || "raster";
      const project = ProjectActions.getProjectState();
      if (!project.project?.project.path) {
        return;
      }

      const projectShortPath = await WindowsAPI.generateShortPath(
        project.project.project.path,
      );
      const rasterId = uuid();
      const outputDir = window.electronAPI.pathJoin(
        projectShortPath,
        "import",
        "raster",
        rasterId,
      );
      await window.electronAPI.createProjectDirectory(outputDir);

      const fileExtension = filePath.replace(/^.*\./, "") || "tif";
      const cogFileName = `${fileName}.tif`;
      const sourceFileName = `${fileName}_source.${fileExtension}`;
      const sourceFullPath = window.electronAPI.pathJoin(
        outputDir,
        sourceFileName,
      );
      await window.electronAPI.copyFile(filePath, sourceFullPath);

      const inputShortPath = await WindowsAPI.generateShortPath(sourceFullPath);
      const launcherPath = await PathService.getPGDALPath();

      let bbox: BBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
      };
      let center: Center = { x: 0, y: 0 };
      let bands: RasterBandInfo[] = [{ band: 1, type: "Unknown" }];
      let width = 0;
      let height = 0;

      const assetPath = window.electronAPI.pathJoin(
        "import",
        "raster",
        rasterId,
        cogFileName,
      );
      const raster: Raster = {
        id: rasterId,
        name: fileName,
        fileType: "raster",
        extension: `.${fileExtension}`,
        asset: assetPath,
        path: assetPath,
        bbox,
        center,
        epsg: "4326",
        epsgText: "WGS 84",
        proj4: "+proj=longlat +datum=WGS84 +no_defs",
        width,
        height,
        bands,
        import: true,
      };

      // Optional: convert to COG via launcher.bat (gdal_translate)
      const outputShortPath = await WindowsAPI.generateShortPath(outputDir);
      const cogOutputPath = window.electronAPI.pathJoin(
        outputShortPath,
        cogFileName,
      );
      // GTiff + tile/compress (COG uyumlu; eski GDAL -of COG tanımıyor)
      const cogResult = await ShellCommandService.execute({
        command: launcherPath,
        args: [
          window.electronAPI.pathJoin(
            await PathService.getPGDALFolderPath(),
            "scripts",
            "gdal_run.py",
          ),
          "gdal_translate",

          "--config",
          "GDAL_NUM_THREADS",
          "ALL_CPUS",

          "-of",
          "COG",

          "-co",
          "COMPRESS=DEFLATE",
          "-co",
          "PREDICTOR=2",
          "-co",
          "ZLEVEL=6",

          "-co",
          "BLOCKSIZE=512",

          "-co",
          "OVERVIEWS=AUTO",
          "-co",
          "RESAMPLING=AVERAGE",

          "-co",
          "BIGTIFF=YES",

          inputShortPath,
          cogOutputPath,
        ],
        process: "other",
      });

      console.error(cogResult);
      if (cogResult.success) {
        raster.cogPath = window.electronAPI.pathJoin(
          "import",
          "raster",
          rasterId,
          cogFileName,
        );

        // Run gdalinfo -json via launcher.bat (through ShellCommandService)
        const capture = await ShellCommandService.executeAndCapture({
          command: launcherPath,
          args: [
            window.electronAPI.pathJoin(
              await PathService.getPGDALFolderPath(),
              "scripts",
              "gdal_run.py",
            ),
            "gdalinfo",
            "-json",
            cogOutputPath,
          ],
        });

        if (capture.success && capture.stdout) {
          try {
            const info: GdalInfoJson = JSON.parse(capture.stdout);
            const parsed = this.parseGdalInfo(info);
            raster.bbox = parsed.bbox;
            raster.center = parsed.center;
            raster.bands = parsed.bands;
            raster.wgs84Extent = parsed.wgs84Extent;
            if (info.size && info.size.length >= 2) {
              raster.width = info.size[0];
              raster.height = info.size[1];
            } else {
              raster.width = width;
              raster.height = height;
            }
            const epsgFromStac = info.stac?.["proj:epsg"];
            if (typeof epsgFromStac === "number") {
              raster.epsg = String(epsgFromStac);
            }
          } catch (e) {
            console.warn("Could not parse gdalinfo JSON, using defaults", e);
          }
        }

        ProjectActions.addRaster(raster);
        try {
          await window.electronAPI.deleteFile(sourceFullPath);
        } catch {
          // ignore cleanup failure
        }
      } else {
        window.electronAPI.deleteFile(outputDir);
      }
    } catch (error) {
      console.error("Raster import error:", error);
    } finally {
      this.importingFiles.delete(filePath);
    }
  }
}

export default RasterService;
