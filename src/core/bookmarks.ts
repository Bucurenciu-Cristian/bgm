import { join } from "path";
import type {
  Profile,
  BookmarksFile,
  BookmarkFolder,
  BookmarkNode,
  Bookmark,
} from "../types";

/**
 * Read and parse bookmarks file for a profile
 */
export async function readBookmarks(profile: Profile): Promise<BookmarksFile> {
  const bookmarksPath = join(profile.path, "Bookmarks");
  const file = Bun.file(bookmarksPath);

  if (!(await file.exists())) {
    throw new Error(`Bookmarks file not found at ${bookmarksPath}`);
  }

  const content = await file.text();
  const raw = JSON.parse(content);

  // Transform raw JSON to our typed structure
  return {
    checksum: raw.checksum,
    version: raw.version || 1,
    roots: {
      bookmark_bar: transformFolder(raw.roots.bookmark_bar),
      other: transformFolder(raw.roots.other),
      synced: transformFolder(raw.roots.synced),
    },
  };
}

/**
 * Transform raw bookmark node to typed structure
 */
function transformNode(raw: Record<string, unknown>): BookmarkNode {
  if (raw.type === "folder") {
    return transformFolder(raw);
  }
  return transformBookmark(raw);
}

/**
 * Transform raw folder to typed BookmarkFolder
 */
function transformFolder(raw: Record<string, unknown>): BookmarkFolder {
  const children = (raw.children as Record<string, unknown>[]) || [];
  return {
    type: "folder",
    id: raw.id as string,
    guid: raw.guid as string,
    name: raw.name as string,
    dateAdded: parseInt(raw.date_added as string) || 0,
    dateModified: parseInt(raw.date_modified as string) || 0,
    children: children.map(transformNode),
  };
}

/**
 * Transform raw bookmark to typed Bookmark
 */
function transformBookmark(raw: Record<string, unknown>): Bookmark {
  return {
    type: "url",
    id: raw.id as string,
    guid: raw.guid as string,
    name: raw.name as string,
    url: raw.url as string,
    dateAdded: parseInt(raw.date_added as string) || 0,
    dateLastUsed: parseInt(raw.date_last_used as string) || 0,
  };
}

/**
 * Get the bookmark bar folder for a profile
 */
export async function getBookmarkBar(
  profile: Profile
): Promise<BookmarkFolder> {
  const bookmarks = await readBookmarks(profile);
  return bookmarks.roots.bookmark_bar;
}

/**
 * Find a folder by path (e.g., "Projects/ClientX")
 */
export function findFolder(
  root: BookmarkFolder,
  path: string
): BookmarkFolder | undefined {
  const parts = path.split("/").filter(Boolean);

  let current: BookmarkFolder = root;

  for (const part of parts) {
    const found = current.children.find(
      (c): c is BookmarkFolder =>
        c.type === "folder" && c.name.toLowerCase() === part.toLowerCase()
    );

    if (!found) {
      return undefined;
    }
    current = found;
  }

  return current;
}

/**
 * Flatten a folder tree into array of bookmarks (URLs only)
 */
export function flattenBookmarks(folder: BookmarkFolder): Bookmark[] {
  const result: Bookmark[] = [];

  function walk(node: BookmarkNode): void {
    if (node.type === "url") {
      result.push(node);
    } else {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const child of folder.children) {
    walk(child);
  }

  return result;
}

/**
 * Get folder tree as printable structure
 */
export function getFolderTree(
  folder: BookmarkFolder,
  indent: number = 0
): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const child of folder.children) {
    if (child.type === "folder") {
      const count = flattenBookmarks(child).length;
      lines.push(`${prefix}📁 ${child.name} (${count})`);
      lines.push(getFolderTree(child, indent + 1));
    } else {
      lines.push(`${prefix}🔗 ${child.name}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

/**
 * List top-level folders in bookmark bar
 */
export function listFolders(folder: BookmarkFolder): BookmarkFolder[] {
  return folder.children.filter((c): c is BookmarkFolder => c.type === "folder");
}
