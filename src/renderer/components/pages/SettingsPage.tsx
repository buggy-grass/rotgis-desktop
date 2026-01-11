import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import SettingsActions from "../../store/actions/SettingsActions";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import MouseSettings from "../mouse/MouseSettings";
import {
  ArrowLeft,
  Palette,
  Globe,
  FolderOpen,
  Cpu,
  MemoryStick,
  Monitor,
  RotateCcw,
  Mouse,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type SettingsCategory = "appearance" | "language" | "project" | "mouse" | "performance";

interface CategoryItem {
  id: SettingsCategory;
  label: string;
  icon: LucideIcon;
  description: string;
}

const categories: CategoryItem[] = [
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme and visual settings",
  },
  {
    id: "language",
    label: "Language & Region",
    icon: Globe,
    description: "Language and regional preferences",
  },
  {
    id: "project",
    label: "Project Settings",
    icon: FolderOpen,
    description: "Default project configurations",
  },
  {
    id: "mouse",
    label: "Mouse Configuration",
    icon: Mouse,
    description: "Mouse and input device settings",
  },
  {
    id: "performance",
    label: "Performance",
    icon: Cpu,
    description: "Performance and optimization settings",
  },
];

export default function SettingsPage() {
  const settings = useSelector((state: RootState) => state.settingsReducer);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("appearance");

  const handleClose = () => {
    SettingsActions.setIsOpen(false);
  };

  const handleResetToDefaults = () => {
    SettingsActions.resetToDefaults();
  };

  const renderContent = () => {
    switch (activeCategory) {
      case "appearance":
        return <AppearanceSettings />;
      case "language":
        return <LanguageSettings />;
      case "project":
        return <ProjectSettings />;
      case "mouse":
        return <MouseSettingsWrapper />;
      case "performance":
        return <PerformanceSettings />;
      default:
        return <AppearanceSettings />;
    }
  };

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-gradient-to-r from-muted/50 via-muted/30 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure application preferences
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          className="gap-2 hover:bg-destructive/10 hover:border-destructive/50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 min-w-[18rem] max-w-[18rem] border-r border-border bg-muted/20 flex flex-col">
          <div className="p-4 space-y-1 overflow-y-auto flex-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }
                  `}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 transition-transform ${
                      isActive ? "scale-110" : "group-hover:scale-105"
                    }`}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-semibold text-sm truncate">{category.label}</div>
                    <div
                      className={`text-xs mt-0.5 truncate ${
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {category.description}
                    </div>
                  </div>
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                    <ChevronRight 
                      className={`h-4 w-4 transition-all duration-200 ${
                        isActive 
                          ? "opacity-100 translate-x-0" 
                          : "opacity-0 -translate-x-2 pointer-events-none"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/10">
          <div className="max-w-5xl mx-auto p-8 transition-all duration-300">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Appearance Settings Component
function AppearanceSettings() {
  const settings = useSelector((state: RootState) => state.settingsReducer);

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    SettingsActions.setTheme(theme);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Palette className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Customize the look and feel of the application
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
        <div className="space-y-3">
          <Label htmlFor="theme" className="text-base font-semibold">
            Theme
          </Label>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color scheme
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`
                  relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all duration-200
                  ${
                    settings.theme === theme
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-border bg-background hover:border-primary/50 hover:bg-accent/50"
                  }
                `}
              >
                <div
                  className={`
                    w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold
                    ${
                      theme === "light"
                        ? "bg-white text-black border-2 border-gray-300"
                        : theme === "dark"
                        ? "bg-gray-900 text-white"
                        : "bg-gradient-to-br from-gray-100 to-gray-900 text-gray-500 border-2 border-gray-400"
                    }
                  `}
                >
                  {theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "💻"}
                </div>
                <span className="text-sm font-medium capitalize">{theme}</span>
                {settings.theme === theme && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Language Settings Component
function LanguageSettings() {
  const settings = useSelector((state: RootState) => state.settingsReducer);

  const handleLanguageChange = (language: string) => {
    SettingsActions.setLanguage(language);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Language & Region</h2>
          <p className="text-sm text-muted-foreground">
            Configure language and regional preferences
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
        <div className="space-y-3">
          <Label htmlFor="language" className="text-base font-semibold">
            Language
          </Label>
          <p className="text-sm text-muted-foreground">
            Select your preferred language
          </p>
          <select
            id="language"
            value={settings.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="mt-4 flex h-12 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:border-primary/50"
          >
            <option value="en">English (US)</option>
            <option value="tr">Türkçe (TR)</option>
            <option value="de">Deutsch (DE)</option>
            <option value="fr">Français (FR)</option>
            <option value="es">Español (ES)</option>
            <option value="it">Italiano (IT)</option>
            <option value="pt">Português (PT)</option>
            <option value="ru">Русский (RU)</option>
            <option value="zh">中文 (ZH)</option>
            <option value="ja">日本語 (JA)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Project Settings Component
function ProjectSettings() {
  const settings = useSelector((state: RootState) => state.settingsReducer);

  const handleAutoSaveChange = (autoSave: boolean) => {
    SettingsActions.setAutoSave(autoSave);
  };

  const handleAutoSaveIntervalChange = (interval: number) => {
    SettingsActions.setAutoSaveInterval(interval);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Project Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure default project behaviors
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div className="space-y-0.5">
            <Label htmlFor="autoSave" className="text-base font-semibold">
              Auto Save
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically save project changes at regular intervals
            </p>
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={settings.autoSave}
            onClick={() => handleAutoSaveChange(!settings.autoSave)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              settings.autoSave
                ? "bg-primary shadow-lg shadow-primary/30"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                settings.autoSave ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {settings.autoSave && (
          <div className="space-y-3 p-4 bg-accent/30 rounded-lg border border-border transition-all duration-200">
            <Label htmlFor="autoSaveInterval" className="text-base font-semibold">
              Auto Save Interval
            </Label>
            <Input
              id="autoSaveInterval"
              type="number"
              min="60"
              max="3600"
              step="60"
              value={settings.autoSaveInterval}
              onChange={(e) =>
                handleAutoSaveIntervalChange(parseInt(e.target.value) || 300)
              }
              className="h-12 text-base"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Current interval:</span>
              <span className="font-semibold text-foreground">
                {Math.floor(settings.autoSaveInterval / 60)} minutes
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3 p-4 bg-accent/30 rounded-lg border border-border">
          <Label htmlFor="defaultProjectPath" className="text-base font-semibold">
            Default Project Path
          </Label>
          <p className="text-sm text-muted-foreground">
            Default directory for saving and opening projects
          </p>
          <div className="flex gap-2 mt-4">
            <Input
              id="defaultProjectPath"
              value={settings.defaultProjectPath}
              onChange={(e) =>
                SettingsActions.setDefaultProjectPath(e.target.value)
              }
              placeholder="C:\\Projects\\RotGIS"
              className="h-12 text-base"
            />
            <Button variant="outline" size="icon" className="h-12 w-12">
              <FolderOpen className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mouse Settings Component (Wrapper for MouseSettings)
function MouseSettingsWrapper() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Mouse className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Mouse Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Customize mouse buttons, DPI, and input settings
          </p>
        </div>
      </div>
      <MouseSettings />
    </div>
  );
}

// Performance Settings Component
function PerformanceSettings() {
  const settings = useSelector((state: RootState) => state.settingsReducer);

  const handleGpuAccelerationChange = (enabled: boolean) => {
    SettingsActions.setGpuAcceleration(enabled);
  };

  const handleMaxMemoryUsageChange = (usage: number) => {
    SettingsActions.setMaxMemoryUsage(usage);
  };

  const handleRenderQualityChange = (
    quality: "low" | "medium" | "high" | "ultra"
  ) => {
    SettingsActions.setRenderQuality(quality);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Cpu className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Performance</h2>
          <p className="text-sm text-muted-foreground">
            Optimize application performance and resource usage
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div className="space-y-0.5">
            <Label htmlFor="gpuAcceleration" className="text-base font-semibold">
              GPU Acceleration
            </Label>
            <p className="text-sm text-muted-foreground">
              Use hardware acceleration for better rendering performance
            </p>
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={settings.gpuAcceleration}
            onClick={() => handleGpuAccelerationChange(!settings.gpuAcceleration)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              settings.gpuAcceleration
                ? "bg-primary shadow-lg shadow-primary/30"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                settings.gpuAcceleration ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="space-y-3 p-4 bg-accent/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick className="h-5 w-5 text-primary" />
            <Label htmlFor="maxMemoryUsage" className="text-base font-semibold">
              Max Memory Usage
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Maximum memory allocation for the application
          </p>
          <Input
            id="maxMemoryUsage"
            type="number"
            min="1024"
            max="32768"
            step="1024"
            value={settings.maxMemoryUsage}
            onChange={(e) =>
              handleMaxMemoryUsageChange(parseInt(e.target.value) || 8192)
            }
            className="h-12 text-base"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <span>Current allocation:</span>
            <span className="font-semibold text-foreground">
              {Math.floor(settings.maxMemoryUsage / 1024)} GB
            </span>
          </div>
        </div>

        <div className="space-y-3 p-4 bg-accent/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-5 w-5 text-primary" />
            <Label htmlFor="renderQuality" className="text-base font-semibold">
              Render Quality
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Quality level for 3D rendering and visualization
          </p>
          <div className="grid grid-cols-4 gap-3">
            {(["low", "medium", "high", "ultra"] as const).map((quality) => (
              <button
                key={quality}
                onClick={() => handleRenderQualityChange(quality)}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200
                  ${
                    settings.renderQuality === quality
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-border bg-background hover:border-primary/50 hover:bg-accent/50"
                  }
                `}
              >
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                    ${
                      quality === "low"
                        ? "bg-red-500/20 text-red-400"
                        : quality === "medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : quality === "high"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-purple-500/20 text-purple-400"
                    }
                  `}
                >
                  {quality === "low"
                    ? "L"
                    : quality === "medium"
                    ? "M"
                    : quality === "high"
                    ? "H"
                    : "U"}
                </div>
                <span className="text-sm font-medium capitalize">{quality}</span>
                {settings.renderQuality === quality && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Higher quality provides better visual results but uses more system resources
          </p>
        </div>
      </div>
    </div>
  );
}

