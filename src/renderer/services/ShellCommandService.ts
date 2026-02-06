import AppActions from "../store/actions/AppActions";

export interface CommandOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  onProgress?: (percentage: number, message: string) => void;
  parseProgress?: (line: string) => { percentage?: number; message?: string } | null;
}

/**
 * Default progress parser for [INFO]: message [PROGRESS]: 52.20 format
 * Also handles: [PROGRESS]: 52.20 (without INFO) or [INFO]: message (without PROGRESS)
 */
const defaultProgressParser = (line: string): { percentage?: number; message?: string } | null => {
  // Skip separator lines like "====="
  if (/^\s*=+\s*$/.test(line)) {
    return null;
  }
  // Pattern: [14%, 1s], [COUNTING: 43%, duration: 1s, throughput: 6MPs]
  const bracketProgressMatch = line.match(/^\s*\[(\d+(?:\.\d+)?)%\s*,[^\]]*]\s*,\s*\[([^\]]+)]/);
  if (bracketProgressMatch) {
    const percentage = parseFloat(bracketProgressMatch[1]);
    const messageBlock = bracketProgressMatch[2].trim();
    const message = messageBlock.split(",")[0]?.trim();
    return {
      percentage: Math.max(0, Math.min(100, percentage)),
      message: message && message.length > 0 ? message : undefined,
    };
  }
  return null;
};

class ShellCommandService {
  private static currentProcess: {
    resolve: (value: { success: boolean; exitCode: number; error?: string }) => void;
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
          const parser = options.parseProgress || defaultProgressParser;
          const parsed = parser(line);
          
          if (parsed) {
            if (parsed.percentage !== undefined) {
              lastPercentage = Math.max(0, Math.min(100, parsed.percentage));
            }
            if (parsed.message !== undefined) {
              lastMessage = parsed.message;
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
          const parser = options.parseProgress || defaultProgressParser;
          const parsed = parser(line);
          
          if (parsed) {
            if (parsed.percentage !== undefined) {
              lastPercentage = Math.max(0, Math.min(100, parsed.percentage));
            }
            if (parsed.message !== undefined) {
              lastMessage = parsed.message;
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

