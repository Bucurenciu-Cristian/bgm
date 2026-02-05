import { describe, expect, test } from "bun:test";
import { getBraveDataDir, isBraveRunning } from "./brave";

describe("getBraveDataDir", () => {
  test("returns path for linux", () => {
    const dir = getBraveDataDir();
    expect(dir).toContain("BraveSoftware/Brave-Browser");
  });

  test("returns existing directory", async () => {
    const dir = getBraveDataDir();
    const exists = await Bun.file(dir + "/Local State").exists();
    // This test assumes Brave is installed
    expect(exists).toBe(true);
  });
});

describe("isBraveRunning", () => {
  test("returns boolean", async () => {
    const running = await isBraveRunning();
    expect(typeof running).toBe("boolean");
  });
});
