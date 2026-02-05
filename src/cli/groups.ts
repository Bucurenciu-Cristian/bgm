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

export const groupsCommand = new Command("groups")
  .description("List and manage tab groups")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (options) => {
    // Warn if Brave is running (data might be stale)
    if (await isBraveRunning()) {
      console.log(
        "⚠️  Brave is running - showing last saved session state\n"
      );
    }

    const profile = await getTargetProfile(options.profile);
    const groups = await getTabGroups(profile);

    console.log(`Tab groups for profile: ${profile.name}\n`);

    if (groups.length === 0) {
      console.log("  (no tab groups found)");
      console.log("\n  Note: Tab groups only appear after closing and reopening Brave.");
    } else {
      for (const group of groups) {
        const colorEmoji = getColorEmoji(group.color);
        console.log(`  ${colorEmoji} ${group.name} (${group.tabs.length} tabs)`);
      }
    }

    console.log(`\nTotal: ${groups.length} group(s)`);
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
