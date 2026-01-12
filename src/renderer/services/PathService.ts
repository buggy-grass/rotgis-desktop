/**
 * PathService - Application path management for development and production
 * Handles dynamic path resolution for executables and modules
 */
class PathService {
  private static appPath: string | null = null;

  /**
   * Ensure electronAPI is available
   * @private
   */
  private static ensureElectronAPI(): void {
    if (!window.electronAPI) {
      throw new Error('Electron API not available. Please restart the application.');
    }
    if (!window.electronAPI.pathJoin) {
      throw new Error('pathJoin function not available in Electron API');
    }
  }

  /**
   * Get application root path (works in both development and production)
   * @returns Promise<string> Application root path
   */
  static async getAppPath(): Promise<string> {
    if (this.appPath) {
      return this.appPath;
    }

    try {
      // Wait for electronAPI to be available (in case of timing issues)
      let retries = 0;
      const maxRetries = 50; // 5 seconds max wait (50 * 100ms)
      while (!window.electronAPI && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (!window.electronAPI) {
        throw new Error('Electron API not available. Please restart the application.');
      }

      if (!window.electronAPI.getAppPath) {
        throw new Error('getAppPath function not available in Electron API');
      }

      this.appPath = await window.electronAPI.getAppPath();
      return this.appPath;
    } catch (error) {
      console.error('Error getting app path:', error);
      // Fallback: try to get from window.location or use process.cwd equivalent
      throw new Error('Failed to get application path');
    }
  }

  /**
   * Get Potree library path
   * @returns Promise<string> Path to libs/potree directory
   */
  static async getPotreePath(): Promise<string> {
    const appPath = await this.getAppPath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(appPath, 'libs', 'potree');
  }

  /**
   * Get PotreeConverter.exe path
   * @returns Promise<string> Path to PotreeConverter.exe
   */
  static async getPotreeConverterPath(): Promise<string> {
    const potreePath = await this.getPotreePath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(potreePath, 'converter', 'PotreeConverter.exe');
  }

  /**
   * Get path to a file in Potree converter directory
   * @param filename Filename in converter directory (e.g., 'laszip.dll')
   * @returns Promise<string> Full path to the file
   */
  static async getPotreeConverterFile(filename: string): Promise<string> {
    const potreePath = await this.getPotreePath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(potreePath, 'converter', filename);
  }

  /**
   * Get path to a file in Potree loaders directory
   * @param filename Filename in loaders directory (e.g., 'OBJLoader.js')
   * @returns Promise<string> Full path to the file
   */
  static async getPotreeLoaderFile(filename: string): Promise<string> {
    const potreePath = await this.getPotreePath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(potreePath, 'loaders', filename);
  }

  /**
   * Get path to a file in Potree exporter directory
   * @param filename Filename in exporter directory (e.g., 'OBJExporter.js')
   * @returns Promise<string> Full path to the file
   */
  static async getPotreeExporterFile(filename: string): Promise<string> {
    const potreePath = await this.getPotreePath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(potreePath, 'exporter', filename);
  }

  /**
   * Get path to a file in Potree CSS directory
   * @param filename Filename in css directory (e.g., 'potree.css')
   * @returns Promise<string> Full path to the file
   */
  static async getPotreeCSSFile(filename: string): Promise<string> {
    const potreePath = await this.getPotreePath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(potreePath, 'css', filename);
  }

  /**
   * Get path to a file in Potree resources directory
   * @param subpath Subpath in resources directory (e.g., 'icons/add.svg' or 'images/background.jpg')
   * @returns Promise<string> Full path to the file
   */
  static async getPotreeResourceFile(subpath: string): Promise<string> {
    const potreePath = await this.getPotreePath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(potreePath, 'resources', subpath);
  }

  /**
   * Get path to a file in Potree workers directory
   * @param filename Filename in workers directory (e.g., 'LASDecoderWorker.js')
   * @returns Promise<string> Full path to the file
   */
  static async getPotreeWorkerFile(filename: string): Promise<string> {
    const potreePath = await this.getPotreePath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(potreePath, 'workers', filename);
  }

  /**
   * Get path to a file in libs directory
   * @param subpath Subpath in libs directory (e.g., 'potree/converter/PotreeConverter.exe')
   * @returns Promise<string> Full path to the file
   */
  static async getLibsFile(subpath: string): Promise<string> {
    const appPath = await this.getAppPath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(appPath, 'libs', subpath);
  }

  /**
   * Get path to a file in a custom subdirectory of libs
   * @param moduleName Module name (e.g., 'potree', 'other-module')
   * @param subpath Subpath within the module (e.g., 'converter/PotreeConverter.exe')
   * @returns Promise<string> Full path to the file
   */
  static async getLibsModuleFile(moduleName: string, subpath: string): Promise<string> {
    const appPath = await this.getAppPath();
    this.ensureElectronAPI();
    return window.electronAPI.pathJoin(appPath, 'libs', moduleName, subpath);
  }

  /**
   * Clear cached app path (useful for testing or path changes)
   */
  static clearCache(): void {
    this.appPath = null;
  }
}

export default PathService;

