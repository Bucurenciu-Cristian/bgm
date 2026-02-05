import { homedir, platform } from "os";
import { join } from "path";

/**
 * Get the Brave browser data directory for the current platform
 */
export function getBraveDataDir(): string {
  const home = homedir();
  const os = platform();

  switch (os) {
    case "linux":
      return join(home, ".config", "BraveSoftware", "Brave-Browser");
    case "darwin":
      return join(
        home,
        "Library",
        "Application Support",
        "BraveSoftware",
        "Brave-Browser"
      );
    case "win32":
      return join(
        process.env.LOCALAPPDATA || join(home, "AppData", "Local"),
        "BraveSoftware",
        "Brave-Browser",
        "User Data"
      );
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

/**
 * Check if Brave browser is currently running
 */
export async function isBraveRunning(): Promise<boolean> {
  const os = platform();

  try {
    if (os === "win32") {
      const proc = Bun.spawn(["tasklist", "/FI", "IMAGENAME eq brave.exe"]);
      const output = await new Response(proc.stdout).text();
      return output.toLowerCase().includes("brave.exe");
    } else {
      // Linux and macOS
      const proc = Bun.spawn(["pgrep", "-x", "brave"]);
      await proc.exited;
      return proc.exitCode === 0;
    }
  } catch {
    // If pgrep/tasklist fails, assume not running
    return false;
  }
}

/**
 * Assert Brave is not running, throw if it is
 */
export async function assertBraveNotRunning(): Promise<void> {
  if (await isBraveRunning()) {
    throw new Error(
      "Brave browser is running. Please close it before modifying browser data."
    );
  }
}
