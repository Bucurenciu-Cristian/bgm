import { Command } from "commander";
import { getProfiles, resolveProfile } from "../core/profiles";
import { parkTabGroup, getDefaultParkedFolder } from "../core/park";
import { unparkBookmarkFolder } from "../core/unpark";
import { isBraveRunning } from "../core/brave";
import type { Profile, TabGroupColor } from "../types";

async function getTargetProfile(profileName?: string): Promise<Profile> {
  if (profileName) {
    const profile = await resolveProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }
    return profile;
  }

  const profiles = await getProfiles();
  return profiles[0]!;
}

export const parkCommand = new Command("park")
  .description("Save a tab group as a bookmark folder")
  .argument("<group-name>", "Name of the tab group to park")
  .option("-p, --profile <name>", "Profile name or directory")
  .option("-t, --to <folder>", "Destination bookmark folder path")
  .option("--dry-run", "Show what would happen without making changes")
  .option("--no-backup", "Skip creating backup before changes")
  .action(async (groupName: string, options) => {
    // Check if Brave is running
    if (!options.dryRun && (await isBraveRunning())) {
      console.error("Error: Brave browser must be closed to park tab groups.");
      console.error("   Please close Brave and try again.");
      process.exit(1);
    }

    const profile = await getTargetProfile(options.profile);

    console.log(`Parking tab group "${groupName}"...`);

    if (options.dryRun) {
      console.log("(dry run - no changes will be made)\n");
    }

    try {
      const result = await parkTabGroup(profile, groupName, {
        destination: options.to,
        dryRun: options.dryRun,
        noBackup: !options.backup,
      });

      console.log(`Parked "${groupName}" to bookmarks`);
      console.log(`   Folder: ${result.folderPath}`);
      console.log(`   Bookmarks: ${result.bookmarkCount}`);

      if (result.backupPath) {
        console.log(`   Backup: ${result.backupPath}`);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

export const unparkCommand = new Command("unpark")
  .description("Restore a bookmark folder as a tab group")
  .argument("<folder-path>", "Path to the bookmark folder")
  .option("-p, --profile <name>", "Profile name or directory")
  .option(
    "-c, --color <color>",
    "Tab group color (grey, blue, red, yellow, green, pink, purple, cyan, orange)",
    "grey"
  )
  .option("--dry-run", "Show what would happen without making changes")
  .option("--no-backup", "Skip creating backup before changes")
  .action(async (folderPath: string, options) => {
    // Check if Brave is running
    if (!options.dryRun && (await isBraveRunning())) {
      console.error("Error: Brave browser must be closed to unpark bookmarks.");
      console.error("   Please close Brave and try again.");
      process.exit(1);
    }

    // Validate color
    const validColors = [
      "grey",
      "blue",
      "red",
      "yellow",
      "green",
      "pink",
      "purple",
      "cyan",
      "orange",
    ];
    if (!validColors.includes(options.color)) {
      console.error(`Invalid color: ${options.color}`);
      console.error(`   Valid colors: ${validColors.join(", ")}`);
      process.exit(1);
    }

    const profile = await getTargetProfile(options.profile);

    console.log(`Unparking bookmark folder "${folderPath}"...`);

    if (options.dryRun) {
      console.log("(dry run - no changes will be made)\n");
    }

    try {
      const result = await unparkBookmarkFolder(profile, folderPath, {
        color: options.color as TabGroupColor,
        dryRun: options.dryRun,
        noBackup: !options.backup,
      });

      console.log(`Created tab group "${result.groupName}"`);
      console.log(`   Tabs: ${result.tabCount}`);
      console.log(`   Color: ${options.color}`);

      if (result.backupPath) {
        console.log(`   Backup: ${result.backupPath}`);
      }

      console.log("\n   Open Brave to see the new tab group.");
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });
