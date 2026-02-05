import { Command } from "commander";
import { getProfiles, resolveProfile } from "../core/profiles";
import {
  getTabGroups,
  getTabGroupByName,
  getClosedRemoteGroups,
  clearClosedRemoteGroups,
  getAllTabGroupsSummary,
} from "../core/groups";
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
  .option("--all", "Include closed remote groups (synced from other devices)")
  .action(async (options) => {
    // Warn if Brave is running (data might be stale)
    if (await isBraveRunning()) {
      console.log(
        "⚠️  Brave is running - showing last saved session state\n"
      );
    }

    const profile = await getTargetProfile(options.profile);

    if (options.all) {
      // Show comprehensive summary
      const summary = await getAllTabGroupsSummary(profile);
      console.log(`All tab groups for profile: ${profile.name}\n`);

      console.log("Session Groups (active):");
      if (summary.sessionGroups.length === 0) {
        console.log("  (none)");
      } else {
        for (const group of summary.sessionGroups) {
          const colorEmoji = getColorEmoji(group.color);
          const junkMarker = isPhoneSyncGroup(group.name) ? " [junk]" : "";
          console.log(`  ${colorEmoji} ${group.name} (${group.tabs.length} tabs)${junkMarker}`);
        }
      }

      console.log("\nClosed Remote Groups (synced from other devices):");
      if (summary.closedRemoteGroups.totalCount === 0) {
        console.log("  (none)");
      } else {
        console.log(`  ${summary.closedRemoteGroups.totalCount} group(s) from ${summary.closedRemoteGroups.bySyncCache.length} device(s)`);
        for (const cache of summary.closedRemoteGroups.bySyncCache) {
          console.log(`    • Device ${cache.cacheGuid.slice(0, 8)}...: ${cache.groupIds.length} group(s)`);
        }
      }

      const total = summary.sessionGroups.length + summary.closedRemoteGroups.totalCount;
      console.log(`\nTotal: ${total} group(s) (${summary.sessionGroups.length} active, ${summary.closedRemoteGroups.totalCount} closed remote)`);

      if (summary.closedRemoteGroups.totalCount > 0) {
        console.log("\nTo clear closed remote groups: bgm groups remote --clear");
      }
      return;
    }

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
        console.log("  (no junk groups found in session)");
      } else {
        console.log("  (no tab groups found in session)");
        console.log("\n  Note: Tab groups only appear after closing and reopening Brave.");
      }
    } else {
      for (const group of groups) {
        const colorEmoji = getColorEmoji(group.color);
        const junkMarker = isPhoneSyncGroup(group.name) ? " [junk]" : "";
        console.log(`  ${colorEmoji} ${group.name} (${group.tabs.length} tabs)${junkMarker}`);
      }
    }

    // Also show closed remote count
    const remoteGroups = await getClosedRemoteGroups(profile);
    console.log(`\nSession: ${groups.length} group(s)`);
    if (remoteGroups.totalCount > 0) {
      console.log(`Closed remote: ${remoteGroups.totalCount} group(s) [use --all to see details]`);
    }

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

// Subcommand: manage remote groups
groupsCommand
  .command("remote")
  .description("Manage closed remote groups (synced from other devices)")
  .option("-p, --profile <name>", "Profile name or directory")
  .option("--clear", "Clear all closed remote group IDs")
  .action(async (options) => {
    const profile = await getTargetProfile(options.profile);
    const remoteGroups = await getClosedRemoteGroups(profile);

    if (!options.clear) {
      // Just show info
      console.log(`Closed remote groups for profile: ${profile.name}\n`);

      if (remoteGroups.totalCount === 0) {
        console.log("  (no closed remote groups)");
        return;
      }

      console.log(`Total: ${remoteGroups.totalCount} group(s)\n`);
      for (const cache of remoteGroups.bySyncCache) {
        console.log(`Device: ${cache.cacheGuid}`);
        for (const groupId of cache.groupIds) {
          console.log(`  • ${groupId}`);
        }
        console.log("");
      }

      console.log("Note: These are groups that synced from other devices");
      console.log("      but were closed on this device. Names are not available");
      console.log("      (stored encrypted in sync data).");
      console.log("\nTo clear: bgm groups remote --clear");
      return;
    }

    // Clear closed remote groups
    if (await isBraveRunning()) {
      console.error("Error: Brave browser must be closed to modify Preferences.");
      console.error("   Please close Brave and try again.");
      process.exit(1);
    }

    if (remoteGroups.totalCount === 0) {
      console.log("No closed remote groups to clear.");
      return;
    }

    console.log(`Clearing ${remoteGroups.totalCount} closed remote group(s)...`);

    // Create backup of Preferences first
    const { createBackup } = await import("../core/backup");
    const { join } = await import("path");
    const prefsPath = join(profile.path, "Preferences");
    await createBackup(prefsPath, "preferences");

    const cleared = await clearClosedRemoteGroups(profile);
    console.log(`Cleared ${cleared} closed remote group ID(s).`);
    console.log("\nThis means Brave will 'forget' that these synced groups were closed.");
    console.log("If they still exist on other devices, they may re-sync next time.");
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
