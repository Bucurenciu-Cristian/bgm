import type { Profile, TabGroup, BookmarkFolder } from "../types";
import { getTabGroupByName } from "./groups";
import {
  readBookmarks,
  writeBookmarks,
  createBookmarkFolder,
  addBookmark,
  ensureFolderPath,
} from "./bookmarks";
import { createBackup } from "./backup";
import { assertBraveNotRunning } from "./brave";
import { join } from "path";

export interface ParkOptions {
  /** Custom destination folder path (default: "Parked Groups") */
  destination?: string;
  /** Don't actually write, just simulate */
  dryRun?: boolean;
  /** Skip backup creation */
  noBackup?: boolean;
}

export interface ParkResult {
  /** Path to the created bookmark folder */
  folderPath: string;
  /** Number of bookmarks created */
  bookmarkCount: number;
  /** Path to backup file (if created) */
  backupPath?: string;
}

const DEFAULT_PARKED_FOLDER = "Parked Groups";

/**
 * Park a tab group as a bookmark folder
 */
export async function parkTabGroup(
  profile: Profile,
  groupName: string,
  options: ParkOptions = {}
): Promise<ParkResult> {
  const { destination, dryRun = false, noBackup = false } = options;

  // Find the tab group
  const group = await getTabGroupByName(profile, groupName);
  if (!group) {
    throw new Error(`Tab group not found: ${groupName}`);
  }

  // Check Brave is not running (unless dry run)
  if (!dryRun) {
    await assertBraveNotRunning();
  }

  // Read current bookmarks
  const bookmarks = await readBookmarks(profile);

  // Determine destination folder path
  const basePath = destination || DEFAULT_PARKED_FOLDER;
  const folderPath = `${basePath}/${group.name}`;

  // Ensure the path exists and get/create the folder
  const { bookmarks: updatedBookmarks, folder: parentFolder } =
    ensureFolderPath(bookmarks, basePath);

  // Create the group folder
  const groupFolder = createBookmarkFolder(group.name);

  // Add bookmarks for each tab
  for (const tab of group.tabs) {
    const bookmark = addBookmark(tab.title, tab.url);
    groupFolder.children.push(bookmark);
  }

  // Add the group folder to the parent
  parentFolder.children.push(groupFolder);
  parentFolder.dateModified = Date.now() * 1000;

  // Write changes (unless dry run)
  let backupPath: string | undefined;

  if (!dryRun) {
    // Create backup first
    if (!noBackup) {
      const bookmarksPath = join(profile.path, "Bookmarks");
      backupPath = await createBackup(bookmarksPath, "bookmarks");
    }

    // Write updated bookmarks
    await writeBookmarks(profile, updatedBookmarks);
  }

  return {
    folderPath,
    bookmarkCount: group.tabs.length,
    backupPath,
  };
}

/**
 * Get the default parked groups folder name
 */
export function getDefaultParkedFolder(): string {
  return DEFAULT_PARKED_FOLDER;
}
