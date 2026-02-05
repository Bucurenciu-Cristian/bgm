import { Command } from "commander";
import { getProfiles, resolveProfile } from "../core/profiles";
import {
  getBookmarkBar,
  listFolders,
  findFolder,
  getFolderTree,
  flattenBookmarks,
} from "../core/bookmarks";
import type { Profile } from "../types";

async function getTargetProfile(profileName?: string): Promise<Profile> {
  if (profileName) {
    const profile = await resolveProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }
    return profile;
  }

  // Default to first profile
  const profiles = await getProfiles();
  return profiles[0];
}

export const bookmarksCommand = new Command("bookmarks")
  .description("List and manage bookmarks")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (options) => {
    const profile = await getTargetProfile(options.profile);
    const bar = await getBookmarkBar(profile);
    const folders = listFolders(bar);

    console.log(`Bookmarks for profile: ${profile.name}\n`);

    if (folders.length === 0) {
      console.log("  (no folders)");
    } else {
      for (const folder of folders) {
        const count = flattenBookmarks(folder).length;
        console.log(`  📁 ${folder.name} (${count} bookmarks)`);
      }
    }

    // Count items not in folders
    const topLevelUrls = bar.children.filter((c) => c.type === "url");
    if (topLevelUrls.length > 0) {
      console.log(`  🔗 ${topLevelUrls.length} bookmark(s) at root`);
    }
  });

// Subcommand: show folder contents
bookmarksCommand
  .command("show <path>")
  .description("Show contents of a bookmark folder")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (path: string, options) => {
    const profile = await getTargetProfile(options.profile);
    const bar = await getBookmarkBar(profile);
    const folder = findFolder(bar, path);

    if (!folder) {
      console.error(`Folder not found: ${path}`);
      process.exit(1);
    }

    console.log(`📁 ${folder.name}\n`);
    console.log(getFolderTree(folder));
  });
