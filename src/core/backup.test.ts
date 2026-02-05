import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createBackup, listBackups, getBackupDir } from "./backup";
import { join } from "path";
import { mkdir, rm, writeFile } from "fs/promises";

describe("backup", () => {
  const testDir = "/tmp/bgm-backup-test";

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("getBackupDir returns XDG-compliant path", () => {
    const dir = getBackupDir();
    expect(dir).toContain("bgm");
    expect(dir).toContain("backups");
  });

  test("createBackup copies file to backup directory", async () => {
    // Create a test file
    const testFile = join(testDir, "test-file.json");
    await writeFile(testFile, '{"test": true}');

    const backupPath = await createBackup(testFile, "test");
    expect(backupPath).toContain("backups");
    expect(backupPath).toContain("test");

    // Verify backup exists
    const backupFile = Bun.file(backupPath);
    expect(await backupFile.exists()).toBe(true);
  });

  test("listBackups returns backup entries", async () => {
    const backups = await listBackups();
    expect(Array.isArray(backups)).toBe(true);
  });
});
