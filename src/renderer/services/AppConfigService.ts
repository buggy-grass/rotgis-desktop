import ISettingsState from "../models/ISettingsState";
import PathService from "./PathService";

interface AppConfig {
  autoSave: boolean;
  theme: "light" | "dark" | "system";
  language: string;
  autoSaveInterval: number;
  defaultProjectPath: string;
  gpuAcceleration: boolean;
  maxMemoryUsage: number;
  renderQuality: "low" | "medium" | "high" | "ultra";
  zoomButton?: number;
  rotateButton?: number;
  dragButton?: number;
  zoomSpeed?: number;
  rotationSpeed?: number;
}

class AppConfigService {
  private static configFileName = "rot.app.config";
  private static defaultConfig: AppConfig = {
    autoSave: true,
    theme: "dark",
    language: "en",
    autoSaveInterval: 300,
    defaultProjectPath: "",
    gpuAcceleration: true,
    maxMemoryUsage: 8192,
    renderQuality: "high",
    zoomButton: 8, // Mouse Right (0b0010)
    rotateButton: 2, // Not set by default
    dragButton: 1, // Button 4 (0b1000)
    zoomSpeed: 20,
    rotationSpeed: 20,
  };

  /**
   * Get config file path
   */
  private static async getConfigFilePath(): Promise<string> {
    const appPath = await PathService.getAppPath();
    
    // Ensure electronAPI is available
    if (!window.electronAPI || !window.electronAPI.pathJoin) {
      throw new Error('Electron API not available. Please restart the application.');
    }
    
    return window.electronAPI.pathJoin(appPath, this.configFileName);
  }

  /**
   * Parse config file content
   */
  private static parseConfigFile(content: string): AppConfig | null {
    try {
      const lines = content.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
      const config: Partial<AppConfig> = {};

      for (const line of lines) {
        const match = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (!match) continue;

        const key = match[1];
        let value: any = match[2].trim();

        // Parse boolean values
        if (value === "true") value = true;
        else if (value === "false") value = false;
        // Parse binary numbers (0b prefix)
        else if (value.startsWith("0b")) {
          value = parseInt(value.substring(2), 2);
        }
        // Parse integer values
        else if (/^-?\d+$/.test(value)) {
          value = parseInt(value, 10);
        }
        // Parse float values
        else if (/^-?\d+\.\d+$/.test(value)) {
          value = parseFloat(value);
        }

        // Map config keys to AppConfig properties
        switch (key) {
          case "autoSave":
            config.autoSave = value as boolean;
            break;
          case "theme":
            if (["light", "dark", "system"].includes(value)) {
              config.theme = value as "light" | "dark" | "system";
            }
            break;
          case "language":
            config.language = value as string;
            break;
          case "autoSaveInterval":
            config.autoSaveInterval = value as number;
            break;
          case "defaultProjectPath":
            config.defaultProjectPath = value as string;
            break;
          case "gpuAcceleration":
            config.gpuAcceleration = value as boolean;
            break;
          case "maxMemoryUsage":
            config.maxMemoryUsage = value as number;
            break;
          case "renderQuality":
            if (["low", "medium", "high", "ultra"].includes(value)) {
              config.renderQuality = value as "low" | "medium" | "high" | "ultra";
            }
            break;
          case "zoomButton":
            config.zoomButton = value as number;
            break;
          case "rotateButton":
            config.rotateButton = value as number;
            break;
          case "dragButton":
            config.dragButton = value as number;
            break;
          case "zoomSpeed":
            config.zoomSpeed = value as number;
            break;
          case "rotationSpeed":
            config.rotationSpeed = value as number;
            break;
        }
      }

      // Validate and merge with defaults
      return { ...this.defaultConfig, ...config };
    } catch (error) {
      console.error("Error parsing config file:", error);
      return null;
    }
  }

  /**
   * Serialize config to file format
   */
  private static serializeConfig(config: AppConfig): string {
    const lines: string[] = [];

    lines.push(`autoSave = ${config.autoSave}`);
    lines.push(`theme = ${config.theme}`);
    lines.push(`language = ${config.language}`);
    lines.push(`autoSaveInterval = ${config.autoSaveInterval}`);
    lines.push(`defaultProjectPath = ${config.defaultProjectPath}`);
    lines.push(`gpuAcceleration = ${config.gpuAcceleration}`);
    lines.push(`maxMemoryUsage = ${config.maxMemoryUsage}`);
    lines.push(`renderQuality = ${config.renderQuality}`);

    // Only write button values if they are defined and not 0
    if (config.zoomButton !== undefined && config.zoomButton !== null && config.zoomButton !== 0) {
      const binaryValue = config.zoomButton.toString(2);
      lines.push(`zoomButton = 0b${binaryValue}`);
      console.log("Serializing zoomButton:", config.zoomButton, "as 0b" + binaryValue);
    }
    if (config.rotateButton !== undefined && config.rotateButton !== null && config.rotateButton !== 0) {
      const binaryValue = config.rotateButton.toString(2);
      lines.push(`rotateButton = 0b${binaryValue}`);
      console.log("Serializing rotateButton:", config.rotateButton, "as 0b" + binaryValue);
    }
    if (config.dragButton !== undefined && config.dragButton !== null && config.dragButton !== 0) {
      const binaryValue = config.dragButton.toString(2);
      lines.push(`dragButton = 0b${binaryValue}`);
      console.log("Serializing dragButton:", config.dragButton, "as 0b" + binaryValue);
    }
    if (config.zoomSpeed !== undefined) {
      lines.push(`zoomSpeed = ${config.zoomSpeed}`);
    }
    if (config.rotationSpeed !== undefined) {
      lines.push(`rotationSpeed = ${config.rotationSpeed}`);
    }

    return lines.join("\n");
  }

  /**
   * Convert ISettingsState to AppConfig
   */
  private static settingsStateToConfig(state: ISettingsState): AppConfig {
    return {
      autoSave: state.autoSave,
      theme: state.theme,
      language: state.language,
      autoSaveInterval: state.autoSaveInterval,
      defaultProjectPath: state.defaultProjectPath,
      gpuAcceleration: state.gpuAcceleration,
      maxMemoryUsage: state.maxMemoryUsage,
      renderQuality: state.renderQuality,
      zoomButton: state.zoomButton,
      rotateButton: state.rotateButton,
      dragButton: state.dragButton,
      zoomSpeed: state.zoomSpeed,
      rotationSpeed: state.rotationSpeed
    };
  }

  /**
   * Convert AppConfig to partial ISettingsState
   */
  private static configToSettingsState(config: AppConfig): Partial<ISettingsState> {
    return {
      autoSave: config.autoSave,
      theme: config.theme,
      language: config.language,
      autoSaveInterval: config.autoSaveInterval,
      defaultProjectPath: config.defaultProjectPath,
      gpuAcceleration: config.gpuAcceleration,
      maxMemoryUsage: config.maxMemoryUsage,
      renderQuality: config.renderQuality,
      zoomButton: config.zoomButton,
      rotateButton: config.rotateButton,
      dragButton: config.dragButton,
      zoomSpeed: config.zoomSpeed ?? 20,
      rotationSpeed: config.rotationSpeed ?? 20,
      acceleration: false
    };
  }

  /**
   * Load config from file
   */
  static async loadConfig(): Promise<AppConfig | null> {
    try {
      const configPath = await this.getConfigFilePath();

      // Try to read file
      try {
        const content = await window.electronAPI.readProjectXML(configPath);
        const parsed = this.parseConfigFile(content);

        if (!parsed) {
          // Invalid format, delete and recreate
          try {
            await window.electronAPI.deleteFile(configPath);
          } catch (e) {
            // Ignore delete errors
          }
          try {
            await this.saveConfig(this.defaultConfig);
          } catch (saveError) {
            console.error("Error saving default config after invalid parse:", saveError);
          }
          return this.defaultConfig;
        }

        return parsed;
      } catch (readError: any) {
        // File doesn't exist (ENOENT) or can't be read, create default
        if (readError?.code === 'ENOENT' || readError?.message?.includes('ENOENT')) {
          // File doesn't exist, create it
          try {
            await this.saveConfig(this.defaultConfig);
            console.log("Config file created with default settings");
          } catch (saveError) {
            console.error("Error creating default config file:", saveError);
            // Even if save fails, return default config so app can continue
          }
        } else {
          // Other read error, try to save anyway
          console.warn("Error reading config file, attempting to create default:", readError);
          try {
            await this.saveConfig(this.defaultConfig);
          } catch (saveError) {
            console.error("Error creating default config file:", saveError);
          }
        }
        return this.defaultConfig;
      }
    } catch (error) {
      console.error("Error loading config:", error);
      // Try to create default config
      try {
        await this.saveConfig(this.defaultConfig);
        console.log("Config file created with default settings (outer catch)");
      } catch (e) {
        console.error("Error creating default config:", e);
      }
      return this.defaultConfig;
    }
  }

  /**
   * Save config to file
   */
  static async saveConfig(config: AppConfig): Promise<void> {
    try {
      const configPath = await this.getConfigFilePath();
      const content = this.serializeConfig(config);
      await window.electronAPI.writeProjectXML(configPath, content);
    } catch (error) {
      console.error("Error saving config:", error);
      throw error;
    }
  }

  /**
   * Save settings state to config file
   */
  static async saveSettingsState(state: ISettingsState): Promise<void> {
    const config = this.settingsStateToConfig(state);
    await this.saveConfig(config);
  }

  /**
   * Load config and return as partial settings state
   */
  static async loadSettingsState(): Promise<Partial<ISettingsState>> {
    const config = await this.loadConfig();
    if (!config) {
      return {};
    }
    return this.configToSettingsState(config);
  }

  /**
   * Get default config
   */
  static getDefaultConfig(): AppConfig {
    return { ...this.defaultConfig };
  }
}

export default AppConfigService;

