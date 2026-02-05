import { join } from "path";
import { readdir } from "fs/promises";
import type { Profile } from "../types";

export interface SessionFile {
  path: string;
  type: "Session" | "Tabs" | "Apps";
  timestamp: number;
  filename: string;
}

/**
 * Get all session files for a profile
 */
export async function getSessionFiles(profile: Profile): Promise<SessionFile[]> {
  const sessionsDir = join(profile.path, "Sessions");

  try {
    const entries = await readdir(sessionsDir);
    const files: SessionFile[] = [];

    for (const entry of entries) {
      const match = entry.match(/^(Session|Tabs|Apps)_(\d+)$/);
      if (match) {
        files.push({
          path: join(sessionsDir, entry),
          type: match[1] as SessionFile["type"],
          timestamp: parseInt(match[2]!),
          filename: entry,
        });
      }
    }

    // Sort by timestamp descending (newest first)
    files.sort((a, b) => b.timestamp - a.timestamp);
    return files;
  } catch (error) {
    // Sessions directory might not exist
    return [];
  }
}

/**
 * Get the latest session file of a specific type
 */
export async function getLatestSessionFile(
  profile: Profile,
  type: SessionFile["type"]
): Promise<SessionFile | undefined> {
  const files = await getSessionFiles(profile);
  return files.find((f) => f.type === type);
}

/**
 * Get the Sessions directory path for a profile
 */
export function getSessionsDir(profile: Profile): string {
  return join(profile.path, "Sessions");
}
