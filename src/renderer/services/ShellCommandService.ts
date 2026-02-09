import AppActions from "../store/actions/AppActions";

type ConverterProgressResult = {
  percentage?: number; // 13%
  stage?: string; // "COUNTING: 38%"
  duration?: string | null;
  throughput?: string | null;
  ram?: string | null;
  cpu?: number | null;
};

export interface CommandOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  process: "converter" | "other";
  onProgress?: (percentage: number, message: string) => void;
  parseProgress?: (line: string) => ConverterProgressResult | null;
}

/** Options for executeAndCapture (no streaming, no loading UI) */
export interface CaptureCommandOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export const converterProgressParser = (
  line?: string | null,
): ConverterProgressResult | null => {
  if (typeof line !== "string") return null;
  if (line.includes("[INFO]")) return null;
  // 🔥 kritik temizlik
  const text = line
    .replace(/\r/g, "")   // Windows CR
    .trim()
    .replace(/,$/, "");   // sondaki virgül

  if (!text) return null;

  // 1️⃣ [13%, 10s]
  {
    const m = text.match(
      /^\[(\d+(?:\.\d+)?)%\s*,\s*([^\[\]]+)\]$/
    );
    if (m) {
      return {
        percentage: Number(m[1]),
        duration: m[2],
      };
    }
  }

  // 2️⃣ [COUNTING: 38%, duration: 10s, throughput: 19MPs]
  {
    const m = text.match(
      /^\[(\w+:\s*\d+(?:\.\d+)?%)\s*,\s*duration:\s*([^,]+)\s*,\s*throughput:\s*([^\[\]]+)\]$/
    );
    if (m) {
      return {
        stage: m[1],
        duration: m[2],
        throughput: m[3],
      };
    }
  }

  // 3️⃣ [RAM: 1.0GB (highest 1.0GB), CPU: 76%]
  {
    const m = text.match(
      /^\[RAM:\s*([^,]+)\s*,\s*CPU:\s*(\d+)%\]$/
    );
    if (m) {
      return {
        ram: m[1],
        cpu: Number(m[2]),
      };
    }
  }

  return null;
};

const getProgressByType = (type: "converter" | "other") => {
  switch (type) {
    case "converter":
      return converterProgressParser;
    case "other":
      return null;
  }
};

class ShellCommandService {
  private static currentProcess: {
    resolve: (value: {
      success: boolean;
      exitCode: number;
      error?: string;
    }) => void;
    reject: (reason?: any) => void;
  } | null = null;

  /**
   * Execute a shell command and stream stdout/stderr to Redux store
   * @param options Command options
   * @returns Promise with execution result
   */
  static async execute(options: CommandOptions): Promise<{
    success: boolean;
    exitCode: number;
    error?: string;
  }> {
    // Clean up previous listeners
    window.electronAPI.removeCommandListeners();

    // Set loading state
    AppActions.setLoading(true);
    AppActions.resetLoadingProgress();

    return new Promise((resolve, reject) => {
      this.currentProcess = { resolve, reject };

      let lastPercentage = 0;
      let lastMessage = "";

      // Setup stdout listener
      window.electronAPI.onCommandStdout((line: string) => {
        try {
          // Use custom parser if provided, otherwise use default parser
          if(line.includes("[INFO]") || line.includes("====")){
            return;
          }
          const parser =
            getProgressByType(options.process);
          if (!parser) {
            return;
          }
          const parsed = parser(line);
          console.error(parsed)
          if (parsed) {
            
            if (parsed.percentage !== undefined) {
              lastPercentage = parsed.percentage;
              // lastPercentage = Math.max(0, Math.min(100, parsed.percentage));
            }
            if (parsed.stage !== undefined) {
              lastMessage = parsed.stage;
            }
            AppActions.setLoadingProgress(lastPercentage, lastMessage);

            // Call custom progress callback if provided
            if (options.onProgress) {
              options.onProgress(lastPercentage, lastMessage);
            }
          } else {
            // If no percentage parsed, use message only (if line is not empty)
            if (line.trim()) {
              lastMessage = line.trim();
              AppActions.setLoadingProgress(lastPercentage, lastMessage);

              if (options.onProgress) {
                options.onProgress(lastPercentage, lastMessage);
              }
            }
          }
        } catch (error) {
          console.error("Error parsing stdout:", error);
        }
      });

      // Setup stderr listener
      window.electronAPI.onCommandStderr((line: string) => {
        try {
          // Use custom parser if provided, otherwise use default parser
          if(line.includes("[INFO]") || line.includes("====")){
            return;
          }
          const parser =
            options.parseProgress || getProgressByType(options.process);
          if (!parser) {
            return;
          }

          const parsed = parser(line);

          if (parsed) {
            if (parsed.percentage !== undefined) {
              lastPercentage = Math.max(0, Math.min(100, parsed.percentage));
            }
            if (parsed.stage !== undefined) {
              lastMessage = parsed.stage;
            }
            AppActions.setLoadingProgress(lastPercentage, lastMessage);

            if (options.onProgress) {
              options.onProgress(lastPercentage, lastMessage);
            }
          } else {
            // If no percentage parsed, use message only (if line is not empty)
            if (line.trim()) {
              lastMessage = line.trim();
              AppActions.setLoadingProgress(lastPercentage, lastMessage);

              if (options.onProgress) {
                options.onProgress(lastPercentage, lastMessage);
              }
            }
          }
        } catch (error) {
          console.error("Error parsing stderr:", error);
        }
      });

      // Execute command
      window.electronAPI
        .executeCommand({
          command: options.command,
          args: options.args,
          cwd: options.cwd,
          env: options.env,
        })
        .then((result) => {
          // Clean up
          window.electronAPI.removeCommandListeners();
          AppActions.setLoading(false);
          AppActions.resetLoadingProgress();
          this.currentProcess = null;
          resolve(result);
        })
        .catch((error) => {
          // Clean up
          window.electronAPI.removeCommandListeners();
          AppActions.setLoading(false);
          AppActions.resetLoadingProgress();
          this.currentProcess = null;
          reject(error);
        });
    });
  }

  /**
   * Execute a command and return full stdout/stderr (e.g. gdalinfo -json).
   * Does not stream, does not show loading progress. Use for capture-only runs.
   */
  static async executeAndCapture(
    options: CaptureCommandOptions
  ): Promise<{ success: boolean; exitCode: number; stdout: string; stderr: string }> {
    const result = await window.electronAPI.executeCommand({
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      env: options.env,
      captureOutput: true,
    });
    const withStd = result as {
      success: boolean;
      exitCode: number;
      stdout: string;
      stderr: string;
    };
    return {
      success: withStd.success,
      exitCode: withStd.exitCode,
      stdout: withStd.stdout ?? "",
      stderr: withStd.stderr ?? "",
    };
  }

  /**
   * Cancel current command execution
   */
  static cancel(): void {
    if (this.currentProcess) {
      window.electronAPI.removeCommandListeners();
      AppActions.setLoading(false);
      AppActions.resetLoadingProgress();
      this.currentProcess.reject(new Error("Command cancelled"));
      this.currentProcess = null;
    }
  }
}

export default ShellCommandService;
