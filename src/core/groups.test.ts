import { describe, expect, test } from "bun:test";
import { getTabGroups } from "./groups";
import { getProfiles } from "./profiles";

describe("getTabGroups", () => {
  test("returns array of tab groups", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const groups = await getTabGroups(defaultProfile);

    expect(Array.isArray(groups)).toBe(true);
  });

  test("tab groups have required fields", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const groups = await getTabGroups(defaultProfile);

    if (groups.length === 0) {
      console.log("No tab groups found, skipping field validation");
      return;
    }

    const group = groups[0]!;
    expect(group).toHaveProperty("token");
    expect(group).toHaveProperty("name");
    expect(group).toHaveProperty("color");
    expect(group).toHaveProperty("tabs");
    expect(Array.isArray(group.tabs)).toBe(true);
  });
});
