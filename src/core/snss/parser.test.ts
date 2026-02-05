import { describe, expect, test } from "bun:test";
import { parseSessionFile } from "./parser";
import { getProfiles } from "../profiles";
import { getLatestSessionFile } from "../sessions";

describe("parseSessionFile", () => {
  test("parses latest session file", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const sessionFile = await getLatestSessionFile(defaultProfile, "Session");

    if (!sessionFile) {
      console.log("No session file found, skipping test");
      return;
    }

    const result = await parseSessionFile(sessionFile.path);
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("commands");
    expect(Array.isArray(result.commands)).toBe(true);
  });

  test("extracts tab groups from session", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const sessionFile = await getLatestSessionFile(defaultProfile, "Session");

    if (!sessionFile) {
      console.log("No session file found, skipping test");
      return;
    }

    const result = await parseSessionFile(sessionFile.path);

    // Check for tab group commands (may be empty if no groups exist)
    const groupCommands = result.commands.filter(
      (c) => c.id === 25 || c.id === 26 || c.id === 27
    );
    expect(Array.isArray(groupCommands)).toBe(true);
  });
});
