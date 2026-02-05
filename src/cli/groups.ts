import { Command } from "commander";
import { getProfiles, resolveProfile } from "../core/profiles";
import { getTabGroups, getTabGroupByName } from "../core/groups";
import { isBraveRunning } from "../core/brave";
import type { Profile } from "../types";

async function getTargetProfile(profileName?: string): Promise<Profile> {
  if (profileName) {
    const profile = await resolveProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }
    return profile;
  }

  const profiles = await getProfiles();
  if (profiles.length === 0) {
    throw new Error("No Brave profiles found");
  }
  return profiles[0]!;
}

// Pattern to match auto-synced phone groups like "1 tab", "2 tabs", "12 tabs"
const PHONE_SYNC_PATTERN = /^\d+\s+tabs?$/i;

/**
 * Check if a group name matches the phone-sync junk pattern
 */
function isPhoneSyncGroup(name: string): boolean {
  return PHONE_SYNC_PATTERN.test(name.trim());
}

export const groupsCommand = new Command("groups")
  .description("List and manage tab groups")
  .option("-p, --profile <name>", "Profile name or directory")
  .option("--junk", "Only show junk groups (phone-synced 'N tab(s)' pattern)")
  .action(async (options) => {
    // Warn if Brave is running (data might be stale)
    if (await isBraveRunning()) {
      console.log(
        "⚠️  Brave is running - showing last saved session state\n"
      );
    }

    const profile = await getTargetProfile(options.profile);
    let groups = await getTabGroups(profile);

    // Filter to junk groups if requested
    if (options.junk) {
      groups = groups.filter((g) => isPhoneSyncGroup(g.name));
      console.log(`Junk groups (phone-synced) for profile: ${profile.name}\n`);
    } else {
      console.log(`Tab groups for profile: ${profile.name}\n`);
    }

    if (groups.length === 0) {
      if (options.junk) {
        console.log("  (no junk groups found)");
      } else {
        console.log("  (no tab groups found)");
        console.log("\n  Note: Tab groups only appear after closing and reopening Brave.");
      }
    } else {
      for (const group of groups) {
        const colorEmoji = getColorEmoji(group.color);
        const junkMarker = isPhoneSyncGroup(group.name) ? " [junk]" : "";
        console.log(`  ${colorEmoji} ${group.name} (${group.tabs.length} tabs)${junkMarker}`);
      }
    }

    console.log(`\nTotal: ${groups.length} group(s)`);

    if (options.junk && groups.length > 0) {
      console.log("\nTo clean up: bgm groups cleanup --confirm");
    }
  });

// Subcommand: show group contents
groupsCommand
  .command("show <name>")
  .description("Show tabs in a group")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (name: string, options) => {
    const profile = await getTargetProfile(options.profile);
    const group = await getTabGroupByName(profile, name);

    if (!group) {
      console.error(`Tab group not found: ${name}`);
      process.exit(1);
    }

    const colorEmoji = getColorEmoji(group.color);
    console.log(`${colorEmoji} ${group.name}\n`);

    if (group.tabs.length === 0) {
      console.log("  (no tabs)");
    } else {
      for (const tab of group.tabs) {
        console.log(`  • ${tab.title}`);
        console.log(`    ${tab.url}\n`);
      }
    }
  });

// Subcommand: cleanup junk groups
groupsCommand
  .command("cleanup")
  .description("List and optionally park junk groups (phone-synced 'N tab(s)' pattern)")
  .option("-p, --profile <name>", "Profile name or directory")
  .option("--confirm", "Actually park the junk groups (saves URLs to bookmarks)")
  .action(async (options) => {
    // Check if Brave is running
    if (options.confirm && (await isBraveRunning())) {
      console.error("Error: Brave browser must be closed to cleanup groups.");
      console.error("   Please close Brave and try again.");
      process.exit(1);
    }

    const profile = await getTargetProfile(options.profile);
    const allGroups = await getTabGroups(profile);
    const junkGroups = allGroups.filter((g) => isPhoneSyncGroup(g.name));

    if (junkGroups.length === 0) {
      console.log("No junk groups found. Nothing to clean up.");
      return;
    }

    console.log(`Found ${junkGroups.length} junk group(s):\n`);
    for (const group of junkGroups) {
      const colorEmoji = getColorEmoji(group.color);
      console.log(`  ${colorEmoji} ${group.name} (${group.tabs.length} tabs)`);
    }

    if (!options.confirm) {
      console.log("\nTo park these groups to bookmarks, run:");
      console.log("  bgm groups cleanup --confirm");
      console.log("\n(URLs will be saved to 'Phone Sync Junk' folder)");
      return;
    }

    // Import park function dynamically to avoid circular deps
    const { parkTabGroup } = await import("../core/park");

    console.log("\nParking junk groups...\n");

    let parked = 0;
    for (const group of junkGroups) {
      try {
        const result = await parkTabGroup(profile, group.name, {
          destination: "Phone Sync Junk",
          noBackup: parked > 0, // Only backup on first park
        });
        console.log(`  Parked "${group.name}" → ${result.folderPath}`);
        parked++;
      } catch (error) {
        console.error(`  Failed to park "${group.name}": ${(error as Error).message}`);
      }
    }

    console.log(`\nParked ${parked} group(s) to "Phone Sync Junk" folder.`);
    console.log("Note: Tab groups will remain until you close the tabs in Brave.");
    console.log("      The URLs are now safely saved in bookmarks.");
  });

function getColorEmoji(color: string): string {
  const colors: Record<string, string> = {
    grey: "⚪",
    blue: "🔵",
    red: "🔴",
    yellow: "🟡",
    green: "🟢",
    pink: "🩷",
    purple: "🟣",
    cyan: "🩵",
    orange: "🟠",
  };
  return colors[color] || "⚪";
}
