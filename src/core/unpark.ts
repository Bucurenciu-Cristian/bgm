import type { Profile, TabGroupColor } from "../types";
import { readBookmarks, findFolder, flattenBookmarks } from "./bookmarks";
import { getLatestSessionFile } from "./sessions";
import { createTabGroupCommands, appendToSessionFile } from "./snss/writer";
import { createBackup } from "./backup";
import { assertBraveNotRunning } from "./brave";

export interface UnparkOptions {
  /** Tab group color (default: grey) */
  color?: TabGroupColor;
  /** Don't actually write, just simulate */
  dryRun?: boolean;
  /** Skip backup creation */
  noBackup?: boolean;
}

export interface UnparkResult {
  /** Name of the created tab group */
  groupName: string;
  /** Number of tabs in the group */
  tabCount: number;
  /** Path to backup file (if created) */
  backupPath?: string;
}

/**
 * Unpark a bookmark folder as a tab group
 */
export async function unparkBookmarkFolder(
  profile: Profile,
  folderPath: string,
  options: UnparkOptions = {}
): Promise<UnparkResult> {
  const { color = "grey", dryRun = false, noBackup = false } = options;

  // Check Brave is not running (unless dry run)
  if (!dryRun) {
    await assertBraveNotRunning();
  }

  // Read bookmarks and find the folder
  const bookmarks = await readBookmarks(profile);
  const folder = findFolder(bookmarks.roots.bookmark_bar, folderPath);

  if (!folder) {
    throw new Error(`Bookmark folder not found: ${folderPath}`);
  }

  // Get all bookmarks (URLs) in the folder
  const urls = flattenBookmarks(folder);

  if (urls.length === 0) {
    throw new Error(`Bookmark folder is empty: ${folderPath}`);
  }

  // Get the latest session file
  const sessionFile = await getLatestSessionFile(profile, "Session");
  if (!sessionFile) {
    throw new Error("No session file found. Make sure Brave has been opened at least once.");
  }

  // Create tab group commands
  const tabs = urls.map((b) => ({
    url: b.url,
    title: b.name,
  }));

  const commands = createTabGroupCommands(folder.name, color, tabs);

  // Write changes (unless dry run)
  let backupPath: string | undefined;

  if (!dryRun) {
    // Create backup first
    if (!noBackup) {
      backupPath = await createBackup(sessionFile.path, "session");
    }

    // Append commands to session file
    await appendToSessionFile(sessionFile.path, commands);
  }

  return {
    groupName: folder.name,
    tabCount: urls.length,
    backupPath,
  };
}
