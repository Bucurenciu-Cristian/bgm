import { describe, expect, test } from "bun:test";
import { getProfiles, getProfileByName, getProfileByDirectory } from "./profiles";

describe("getProfiles", () => {
  test("returns array of profiles", async () => {
    const profiles = await getProfiles();
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThan(0);
  });

  test("profiles have required fields", async () => {
    const profiles = await getProfiles();
    const profile = profiles[0];
    expect(profile).toHaveProperty("directory");
    expect(profile).toHaveProperty("name");
    expect(profile).toHaveProperty("path");
  });

  test("includes Default profile", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default");
    expect(defaultProfile).toBeDefined();
  });
});

describe("getProfileByName", () => {
  test("finds profile by display name", async () => {
    const profiles = await getProfiles();
    const firstName = profiles[0]!.name;
    const found = await getProfileByName(firstName);
    expect(found).toBeDefined();
    expect(found?.name).toBe(firstName);
  });

  test("returns undefined for non-existent profile", async () => {
    const found = await getProfileByName("NonExistentProfile12345");
    expect(found).toBeUndefined();
  });

  test("is case-insensitive", async () => {
    const profiles = await getProfiles();
    const firstName = profiles[0]!.name;
    const found = await getProfileByName(firstName.toLowerCase());
    expect(found).toBeDefined();
  });
});

describe("getProfileByDirectory", () => {
  test("finds profile by directory name", async () => {
    const found = await getProfileByDirectory("Default");
    expect(found).toBeDefined();
    expect(found?.directory).toBe("Default");
  });
});
