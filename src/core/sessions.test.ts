import { describe, expect, test } from "bun:test";
import { getSessionFiles, getLatestSessionFile } from "./sessions";
import { getProfiles } from "./profiles";

describe("getSessionFiles", () => {
  test("returns session files for default profile", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const files = await getSessionFiles(defaultProfile);

    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
  });

  test("session files have expected structure", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const files = await getSessionFiles(defaultProfile);

    const file = files[0]!;
    expect(file).toHaveProperty("path");
    expect(file).toHaveProperty("type");
    expect(file).toHaveProperty("timestamp");
    expect(["Session", "Tabs", "Apps"]).toContain(file.type);
  });
});

describe("getLatestSessionFile", () => {
  test("returns most recent session file", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const latest = await getLatestSessionFile(defaultProfile, "Session");

    expect(latest).toBeDefined();
    expect(latest?.type).toBe("Session");
  });
});
