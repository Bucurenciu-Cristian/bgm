import { describe, expect, test } from "bun:test";
import { parkTabGroup } from "./park";
import type { ParkOptions } from "./park";
import { getProfiles } from "./profiles";
import { getTabGroups } from "./groups";

describe("parkTabGroup", () => {
  test("creates bookmark folder from tab group", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const groups = await getTabGroups(defaultProfile);

    if (groups.length === 0) {
      console.log("No tab groups found, skipping park test");
      return;
    }

    const group = groups[0]!;
    const options: ParkOptions = {
      dryRun: true, // Don't actually write
    };

    const result = await parkTabGroup(defaultProfile, group.name, options);

    expect(result).toHaveProperty("folderPath");
    expect(result).toHaveProperty("bookmarkCount");
    expect(result.bookmarkCount).toBe(group.tabs.length);
  });

  test("respects custom destination folder", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const groups = await getTabGroups(defaultProfile);

    if (groups.length === 0) {
      console.log("No tab groups found, skipping park test");
      return;
    }

    const group = groups[0]!;
    const options: ParkOptions = {
      dryRun: true,
      destination: "Test/Parked",
    };

    const result = await parkTabGroup(defaultProfile, group.name, options);

    expect(result.folderPath).toContain("Test/Parked");
  });
});
