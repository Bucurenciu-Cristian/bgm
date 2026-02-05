import { Command } from "commander";
import { getProfiles } from "../core/profiles";

export const profilesCommand = new Command("profiles")
  .description("List and manage Brave profiles")
  .action(async () => {
    const profiles = await getProfiles();

    console.log("Brave profiles:\n");
    for (const profile of profiles) {
      const displayName =
        profile.directory === profile.name
          ? profile.name
          : `${profile.name} (${profile.directory})`;
      console.log(`  • ${displayName}`);
    }
    console.log(`\nTotal: ${profiles.length} profile(s)`);
  });
