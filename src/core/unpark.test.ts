import { describe, expect, test } from "bun:test";
import { unparkBookmarkFolder } from "./unpark";
import type { UnparkOptions } from "./unpark";
import { getProfiles } from "./profiles";
import { readBookmarks } from "./bookmarks";

describe("unparkBookmarkFolder", () => {
  test("converts bookmark folder to tab group commands", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    // Find first folder with bookmarks
    const bar = bookmarks.roots.bookmark_bar;
    const folder = bar.children.find(
      (c) => c.type === "folder" && c.children.some((ch) => ch.type === "url")
    );

    if (!folder || folder.type !== "folder") {
      console.log("No bookmark folder with URLs found, skipping test");
      return;
    }

    const options: UnparkOptions = {
      dryRun: true,
      color: "blue",
    };

    const result = await unparkBookmarkFolder(
      defaultProfile,
      folder.name,
      options
    );

    expect(result).toHaveProperty("groupName");
    expect(result).toHaveProperty("tabCount");
    expect(result.groupName).toBe(folder.name);
  });
});
