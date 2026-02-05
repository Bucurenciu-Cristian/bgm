import { describe, expect, test } from "bun:test";
import {
  readBookmarks,
  getBookmarkBar,
  findFolder,
  flattenBookmarks,
} from "./bookmarks";
import { getProfiles } from "./profiles";

describe("readBookmarks", () => {
  test("reads bookmarks file for default profile", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    expect(bookmarks).toHaveProperty("checksum");
    expect(bookmarks).toHaveProperty("roots");
    expect(bookmarks.roots).toHaveProperty("bookmark_bar");
  });
});

describe("getBookmarkBar", () => {
  test("returns bookmark bar folder", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bar = await getBookmarkBar(defaultProfile);

    expect(bar.type).toBe("folder");
    // Brave uses "Bookmarks" (not "Bookmarks bar" like Chrome)
    expect(bar.name).toBe("Bookmarks");
  });
});

describe("findFolder", () => {
  test("finds top-level folder", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    // Find the first folder in bookmark bar
    const bar = bookmarks.roots.bookmark_bar;
    const firstFolder = bar.children.find((c) => c.type === "folder");

    if (firstFolder) {
      const found = findFolder(bookmarks.roots.bookmark_bar, firstFolder.name);
      expect(found).toBeDefined();
      expect(found?.name).toBe(firstFolder.name);
    }
  });

  test("finds nested folder by path", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    // Find first nested folder
    const bar = bookmarks.roots.bookmark_bar;
    for (const child of bar.children) {
      if (child.type === "folder" && child.children.length > 0) {
        const nestedFolder = child.children.find((c) => c.type === "folder");
        if (nestedFolder) {
          const path = `${child.name}/${nestedFolder.name}`;
          const found = findFolder(bar, path);
          expect(found).toBeDefined();
          break;
        }
      }
    }
  });
});

describe("flattenBookmarks", () => {
  test("returns flat array of bookmarks", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    const flat = flattenBookmarks(bookmarks.roots.bookmark_bar);
    expect(Array.isArray(flat)).toBe(true);

    // All items should be URLs, not folders
    for (const item of flat) {
      expect(item.type).toBe("url");
      expect(item).toHaveProperty("url");
    }
  });
});
