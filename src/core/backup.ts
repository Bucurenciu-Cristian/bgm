import { homedir } from "os";
import { join, basename } from "path";
import { mkdir, readdir, copyFile } from "fs/promises";

export interface BackupEntry {
  path: string;
  timestamp: Date;
  type: string;
  filename: string;
}

/**
 * Get the backup directory path
 */
export function getBackupDir(): string {
  const dataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "bgm", "backups");
}

/**
 * Create a backup of a file
 */
export async function createBackup(
  filePath: string,
  type: string
): Promise<string> {
  const backupDir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const originalName = basename(filePath);

  // Create backup directory structure
  const backupSubDir = join(backupDir, timestamp);
  await mkdir(backupSubDir, { recursive: true });

  // Create backup file path
  const backupPath = join(backupSubDir, `${type}-${originalName}`);

  // Copy file
  await copyFile(filePath, backupPath);

  // Write metadata
  const metadataPath = join(backupSubDir, "metadata.json");
  const metadata = {
    timestamp,
    type,
    originalPath: filePath,
    backupPath,
    createdAt: new Date().toISOString(),
  };
  await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));

  return backupPath;
}

/**
 * Create backups for multiple files
 */
export async function createBackups(
  files: { path: string; type: string }[]
): Promise<string[]> {
  const backupDir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupSubDir = join(backupDir, timestamp);
  await mkdir(backupSubDir, { recursive: true });

  const backupPaths: string[] = [];

  for (const file of files) {
    const originalName = basename(file.path);
    const backupPath = join(backupSubDir, `${file.type}-${originalName}`);
    await copyFile(file.path, backupPath);
    backupPaths.push(backupPath);
  }

  // Write metadata
  const metadataPath = join(backupSubDir, "metadata.json");
  const metadata = {
    timestamp,
    files: files.map((f, i) => ({
      type: f.type,
      originalPath: f.path,
      backupPath: backupPaths[i],
    })),
    createdAt: new Date().toISOString(),
  };
  await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));

  return backupPaths;
}

/**
 * List all backups
 */
export async function listBackups(): Promise<BackupEntry[]> {
  const backupDir = getBackupDir();

  try {
    const entries = await readdir(backupDir);
    const backups: BackupEntry[] = [];

    for (const entry of entries) {
      const entryPath = join(backupDir, entry);
      const metadataPath = join(entryPath, "metadata.json");

      try {
        const metadataFile = Bun.file(metadataPath);
        if (await metadataFile.exists()) {
          const metadata = await metadataFile.json();
          backups.push({
            path: entryPath,
            timestamp: new Date(metadata.createdAt),
            type: metadata.type || "unknown",
            filename: entry,
          });
        }
      } catch {
        // Skip invalid backup directories
      }
    }

    // Sort by timestamp descending
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return backups;
  } catch {
    return [];
  }
}
