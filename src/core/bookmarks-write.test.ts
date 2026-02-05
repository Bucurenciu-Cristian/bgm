import { describe, expect, test } from "bun:test";
import {
  createBookmarkFolder,
  addBookmark,
  serializeBookmarks,
} from "./bookmarks";
import { getProfiles } from "./profiles";

describe("bookmark write operations", () => {
  test("createBookmarkFolder creates a new folder structure", () => {
    const folder = createBookmarkFolder("Test Folder");

    expect(folder.type).toBe("folder");
    expect(folder.name).toBe("Test Folder");
    expect(folder.children).toEqual([]);
    expect(folder.id).toBeDefined();
    expect(folder.guid).toBeDefined();
  });

  test("addBookmark creates a bookmark entry", () => {
    const bookmark = addBookmark("Google", "https://google.com");

    expect(bookmark.type).toBe("url");
    expect(bookmark.name).toBe("Google");
    expect(bookmark.url).toBe("https://google.com");
    expect(bookmark.id).toBeDefined();
    expect(bookmark.guid).toBeDefined();
  });

  test("serializeBookmarks produces valid JSON structure", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;

    // Read existing bookmarks
    const { readBookmarks } = await import("./bookmarks");
    const bookmarks = await readBookmarks(defaultProfile);

    // Serialize back
    const serialized = serializeBookmarks(bookmarks);
    const parsed = JSON.parse(serialized);

    expect(parsed).toHaveProperty("checksum");
    expect(parsed).toHaveProperty("roots");
    expect(parsed.roots).toHaveProperty("bookmark_bar");
  });
});
