# bgm Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the core feature - convert tab groups to bookmark folders (park) and bookmark folders back to tab groups (unpark).

**Architecture:** Park creates bookmark folders from tab group data. Unpark modifies SNSS session files to create new tab groups from bookmark URLs. Both operations require Brave to be closed.

**Tech Stack:** Bun, TypeScript, existing core modules from Phase 1 & 2

---

## Feature Overview

### Park (Tab Group → Bookmark Folder)

```bash
bgm park "Research"                    # Creates "Parked Groups/Research" folder
bgm park "Research" --to "Projects"    # Creates "Projects/Research" folder
```

1. Read tab group from session
2. Create bookmark folder with group name
3. Add each tab URL as a bookmark
4. Optionally delete the tab group from session

### Unpark (Bookmark Folder → Tab Group)

```bash
bgm unpark "Parked Groups/Research"           # Restore as tab group
bgm unpark "Projects/Research" --color blue   # With specific color
```

1. Read bookmark folder
2. Generate SNSS commands to create tab group
3. Append commands to session file
4. Brave will restore the group on next launch

---

## Task 1: Backup System

**Files:**
- Create: `src/core/backup.ts`
- Create: `src/core/backup.test.ts`

**Step 1: Write the failing test**

Create `src/core/backup.test.ts`:
```typescript
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createBackup, listBackups, getBackupDir } from "./backup";
import { getProfiles } from "./profiles";
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/backup.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/backup.ts`:
```typescript
import { homedir } from "os";
import { join, basename, dirname } from "path";
import { mkdir, readdir, copyFile, stat } from "fs/promises";

export interface BackupEntry {
  path: string;
  timestamp: Date;
  type: string;
  filename: string;
}

/**
 * Get the backup directory path
 */
export function getBackupDir(): string {
  const dataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "bgm", "backups");
}

/**
 * Create a backup of a file
 */
export async function createBackup(
  filePath: string,
  type: string
): Promise<string> {
  const backupDir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const originalName = basename(filePath);

  // Create backup directory structure
  const backupSubDir = join(backupDir, timestamp);
  await mkdir(backupSubDir, { recursive: true });

  // Create backup file path
  const backupPath = join(backupSubDir, `${type}-${originalName}`);

  // Copy file
  await copyFile(filePath, backupPath);

  // Write metadata
  const metadataPath = join(backupSubDir, "metadata.json");
  const metadata = {
    timestamp,
    type,
    originalPath: filePath,
    backupPath,
    createdAt: new Date().toISOString(),
  };
  await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));

  return backupPath;
}

/**
 * Create backups for multiple files
 */
export async function createBackups(
  files: { path: string; type: string }[]
): Promise<string[]> {
  const backupDir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupSubDir = join(backupDir, timestamp);
  await mkdir(backupSubDir, { recursive: true });

  const backupPaths: string[] = [];

  for (const file of files) {
    const originalName = basename(file.path);
    const backupPath = join(backupSubDir, `${file.type}-${originalName}`);
    await copyFile(file.path, backupPath);
    backupPaths.push(backupPath);
  }

  // Write metadata
  const metadataPath = join(backupSubDir, "metadata.json");
  const metadata = {
    timestamp,
    files: files.map((f, i) => ({
      type: f.type,
      originalPath: f.path,
      backupPath: backupPaths[i],
    })),
    createdAt: new Date().toISOString(),
  };
  await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));

  return backupPaths;
}

/**
 * List all backups
 */
export async function listBackups(): Promise<BackupEntry[]> {
  const backupDir = getBackupDir();

  try {
    const entries = await readdir(backupDir);
    const backups: BackupEntry[] = [];

    for (const entry of entries) {
      const entryPath = join(backupDir, entry);
      const metadataPath = join(entryPath, "metadata.json");

      try {
        const metadataFile = Bun.file(metadataPath);
        if (await metadataFile.exists()) {
          const metadata = await metadataFile.json();
          backups.push({
            path: entryPath,
            timestamp: new Date(metadata.createdAt),
            type: metadata.type || "unknown",
            filename: entry,
          });
        }
      } catch {
        // Skip invalid backup directories
      }
    }

    // Sort by timestamp descending
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return backups;
  } catch {
    return [];
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/backup.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/backup.ts src/core/backup.test.ts
git commit -m "feat: add backup system for safe file modifications"
```

---

## Task 2: Bookmark Write Operations

**Files:**
- Modify: `src/core/bookmarks.ts`
- Create: `src/core/bookmarks-write.test.ts`

**Step 1: Write the failing test**

Create `src/core/bookmarks-write.test.ts`:
```typescript
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import {
  createBookmarkFolder,
  addBookmark,
  serializeBookmarks,
} from "./bookmarks";
import { getProfiles } from "./profiles";
import type { BookmarksFile, BookmarkFolder, Bookmark } from "../types";

describe("bookmark write operations", () => {
  test("createBookmarkFolder creates a new folder structure", () => {
    const folder = createBookmarkFolder("Test Folder");

    expect(folder.type).toBe("folder");
    expect(folder.name).toBe("Test Folder");
    expect(folder.children).toEqual([]);
    expect(folder.id).toBeDefined();
    expect(folder.guid).toBeDefined();
  });

  test("addBookmark creates a bookmark entry", () => {
    const bookmark = addBookmark("Google", "https://google.com");

    expect(bookmark.type).toBe("url");
    expect(bookmark.name).toBe("Google");
    expect(bookmark.url).toBe("https://google.com");
    expect(bookmark.id).toBeDefined();
    expect(bookmark.guid).toBeDefined();
  });

  test("serializeBookmarks produces valid JSON structure", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;

    // Read existing bookmarks
    const { readBookmarks } = await import("./bookmarks");
    const bookmarks = await readBookmarks(defaultProfile);

    // Serialize back
    const serialized = serializeBookmarks(bookmarks);
    const parsed = JSON.parse(serialized);

    expect(parsed).toHaveProperty("checksum");
    expect(parsed).toHaveProperty("roots");
    expect(parsed.roots).toHaveProperty("bookmark_bar");
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/bookmarks-write.test.ts
```

Expected: FAIL - functions not exported

**Step 3: Add write operations to bookmarks.ts**

Add to `src/core/bookmarks.ts`:
```typescript
import { randomUUID } from "crypto";

// ... existing code ...

/**
 * Generate a unique ID for bookmarks (simple incrementing counter simulation)
 */
let nextId = Date.now();
function generateId(): string {
  return String(nextId++);
}

/**
 * Create a new bookmark folder
 */
export function createBookmarkFolder(name: string): BookmarkFolder {
  const now = Date.now() * 1000; // Chrome uses microseconds

  return {
    type: "folder",
    id: generateId(),
    guid: randomUUID(),
    name,
    dateAdded: now,
    dateModified: now,
    children: [],
  };
}

/**
 * Create a new bookmark (URL)
 */
export function addBookmark(name: string, url: string): Bookmark {
  const now = Date.now() * 1000;

  return {
    type: "url",
    id: generateId(),
    guid: randomUUID(),
    name,
    url,
    dateAdded: now,
    dateLastUsed: 0,
  };
}

/**
 * Serialize bookmarks to Chrome/Brave JSON format
 */
export function serializeBookmarks(bookmarks: BookmarksFile): string {
  function serializeNode(node: BookmarkNode): Record<string, unknown> {
    if (node.type === "folder") {
      return {
        type: "folder",
        id: node.id,
        guid: node.guid,
        name: node.name,
        date_added: String(node.dateAdded),
        date_modified: String(node.dateModified),
        children: node.children.map(serializeNode),
      };
    }

    return {
      type: "url",
      id: node.id,
      guid: node.guid,
      name: node.name,
      url: node.url,
      date_added: String(node.dateAdded),
      date_last_used: String(node.dateLastUsed),
    };
  }

  const output = {
    checksum: bookmarks.checksum, // Keep original checksum (Brave recalculates)
    roots: {
      bookmark_bar: serializeNode(bookmarks.roots.bookmark_bar),
      other: serializeNode(bookmarks.roots.other),
      synced: serializeNode(bookmarks.roots.synced),
    },
    version: bookmarks.version || 1,
  };

  return JSON.stringify(output, null, 3); // Chrome uses 3-space indent
}

/**
 * Write bookmarks file for a profile
 */
export async function writeBookmarks(
  profile: Profile,
  bookmarks: BookmarksFile
): Promise<void> {
  const bookmarksPath = join(profile.path, "Bookmarks");
  const content = serializeBookmarks(bookmarks);
  await Bun.write(bookmarksPath, content);
}

/**
 * Add a folder to the bookmark bar
 */
export function addFolderToBookmarkBar(
  bookmarks: BookmarksFile,
  folder: BookmarkFolder
): BookmarksFile {
  return {
    ...bookmarks,
    roots: {
      ...bookmarks.roots,
      bookmark_bar: {
        ...bookmarks.roots.bookmark_bar,
        children: [...bookmarks.roots.bookmark_bar.children, folder],
      },
    },
  };
}

/**
 * Find or create a folder by path, creating intermediate folders as needed
 */
export function ensureFolderPath(
  bookmarks: BookmarksFile,
  path: string
): { bookmarks: BookmarksFile; folder: BookmarkFolder } {
  const parts = path.split("/").filter(Boolean);
  let current = bookmarks.roots.bookmark_bar;
  let modified = bookmarks;

  for (const part of parts) {
    let found = current.children.find(
      (c): c is BookmarkFolder =>
        c.type === "folder" && c.name.toLowerCase() === part.toLowerCase()
    );

    if (!found) {
      // Create the folder
      found = createBookmarkFolder(part);
      current.children.push(found);
      current.dateModified = Date.now() * 1000;
    }

    current = found;
  }

  return { bookmarks: modified, folder: current };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/bookmarks-write.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/bookmarks.ts src/core/bookmarks-write.test.ts
git commit -m "feat: add bookmark write operations"
```

---

## Task 3: Park Command Core Logic

**Files:**
- Create: `src/core/park.ts`
- Create: `src/core/park.test.ts`

**Step 1: Write the failing test**

Create `src/core/park.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { parkTabGroup, ParkOptions } from "./park";
import { getProfiles } from "./profiles";
import { getTabGroups } from "./groups";
import { readBookmarks, findFolder } from "./bookmarks";

describe("parkTabGroup", () => {
  test("creates bookmark folder from tab group", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const groups = await getTabGroups(defaultProfile);

    if (groups.length === 0) {
      console.log("No tab groups found, skipping park test");
      return;
    }

    const group = groups[0];
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

    const group = groups[0];
    const options: ParkOptions = {
      dryRun: true,
      destination: "Test/Parked",
    };

    const result = await parkTabGroup(defaultProfile, group.name, options);

    expect(result.folderPath).toContain("Test/Parked");
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/park.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/park.ts`:
```typescript
import type { Profile, TabGroup, BookmarkFolder } from "../types";
import { getTabGroupByName } from "./groups";
import {
  readBookmarks,
  writeBookmarks,
  createBookmarkFolder,
  addBookmark,
  ensureFolderPath,
} from "./bookmarks";
import { createBackup } from "./backup";
import { assertBraveNotRunning } from "./brave";
import { join } from "path";

export interface ParkOptions {
  /** Custom destination folder path (default: "Parked Groups") */
  destination?: string;
  /** Don't actually write, just simulate */
  dryRun?: boolean;
  /** Skip backup creation */
  noBackup?: boolean;
}

export interface ParkResult {
  /** Path to the created bookmark folder */
  folderPath: string;
  /** Number of bookmarks created */
  bookmarkCount: number;
  /** Path to backup file (if created) */
  backupPath?: string;
}

const DEFAULT_PARKED_FOLDER = "Parked Groups";

/**
 * Park a tab group as a bookmark folder
 */
export async function parkTabGroup(
  profile: Profile,
  groupName: string,
  options: ParkOptions = {}
): Promise<ParkResult> {
  const { destination, dryRun = false, noBackup = false } = options;

  // Find the tab group
  const group = await getTabGroupByName(profile, groupName);
  if (!group) {
    throw new Error(`Tab group not found: ${groupName}`);
  }

  // Check Brave is not running (unless dry run)
  if (!dryRun) {
    await assertBraveNotRunning();
  }

  // Read current bookmarks
  const bookmarks = await readBookmarks(profile);

  // Determine destination folder path
  const basePath = destination || DEFAULT_PARKED_FOLDER;
  const folderPath = `${basePath}/${group.name}`;

  // Ensure the path exists and get/create the folder
  const { bookmarks: updatedBookmarks, folder: parentFolder } =
    ensureFolderPath(bookmarks, basePath);

  // Create the group folder
  const groupFolder = createBookmarkFolder(group.name);

  // Add bookmarks for each tab
  for (const tab of group.tabs) {
    const bookmark = addBookmark(tab.title, tab.url);
    groupFolder.children.push(bookmark);
  }

  // Add the group folder to the parent
  parentFolder.children.push(groupFolder);
  parentFolder.dateModified = Date.now() * 1000;

  // Write changes (unless dry run)
  let backupPath: string | undefined;

  if (!dryRun) {
    // Create backup first
    if (!noBackup) {
      const bookmarksPath = join(profile.path, "Bookmarks");
      backupPath = await createBackup(bookmarksPath, "bookmarks");
    }

    // Write updated bookmarks
    await writeBookmarks(profile, updatedBookmarks);
  }

  return {
    folderPath,
    bookmarkCount: group.tabs.length,
    backupPath,
  };
}

/**
 * Get the default parked groups folder name
 */
export function getDefaultParkedFolder(): string {
  return DEFAULT_PARKED_FOLDER;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/park.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/park.ts src/core/park.test.ts
git commit -m "feat: add park command core logic"
```

---

## Task 4: SNSS Write Operations

**Files:**
- Create: `src/core/snss/writer.ts`
- Create: `src/core/snss/writer.test.ts`

**Step 1: Write the failing test**

Create `src/core/snss/writer.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import {
  createTabGroupCommands,
  serializeCommand,
  appendToSessionFile,
} from "./writer";

describe("SNSS writer", () => {
  test("createTabGroupCommands generates valid command sequence", () => {
    const tabs = [
      { url: "https://example.com", title: "Example" },
      { url: "https://test.com", title: "Test" },
    ];

    const commands = createTabGroupCommands("Test Group", "blue", tabs);

    expect(commands.length).toBeGreaterThan(0);

    // Should have tab group metadata command
    const metadataCmd = commands.find((c) => c.id === 27);
    expect(metadataCmd).toBeDefined();
  });

  test("serializeCommand produces valid binary format", () => {
    const commands = createTabGroupCommands("Test", "green", [
      { url: "https://example.com", title: "Example" },
    ]);

    const serialized = serializeCommand(commands[0]);

    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(3); // At least size(2) + id(1)
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/snss/writer.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/snss/writer.ts`:
```typescript
import { randomBytes } from "crypto";
import type { TabGroupColor } from "../../types";

const COLOR_IDS: Record<TabGroupColor, number> = {
  grey: 0,
  blue: 1,
  red: 2,
  yellow: 3,
  green: 4,
  pink: 5,
  purple: 6,
  cyan: 7,
  orange: 8,
};

export interface TabInput {
  url: string;
  title: string;
}

export interface SessionCommand {
  id: number;
  data: Uint8Array;
}

/**
 * Generate a random 128-bit token for tab group identification
 */
function generateGroupToken(): { high: bigint; low: bigint } {
  const bytes = randomBytes(16);
  const view = new DataView(bytes.buffer);
  return {
    high: view.getBigUint64(0, true),
    low: view.getBigUint64(8, true),
  };
}

/**
 * Generate a session ID (incrementing counter)
 */
let sessionIdCounter = Date.now();
function generateSessionId(): number {
  return sessionIdCounter++;
}

/**
 * Encode a string as Chrome's string16 format (length + UTF-16LE)
 */
function encodeString16(str: string): Uint8Array {
  const encoder = new TextEncoder();
  const utf16 = new Uint8Array(str.length * 2);

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    utf16[i * 2] = code & 0xff;
    utf16[i * 2 + 1] = (code >> 8) & 0xff;
  }

  // Length prefix (4 bytes) + data
  const result = new Uint8Array(4 + utf16.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, str.length, true);
  result.set(utf16, 4);

  return result;
}

/**
 * Create a pickle-wrapped payload
 */
function createPickle(data: Uint8Array): Uint8Array {
  // Pickle format: 4-byte size prefix (aligned to 4 bytes)
  const alignedSize = Math.ceil(data.length / 4) * 4;
  const result = new Uint8Array(4 + alignedSize);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.length, true);
  result.set(data, 4);
  return result;
}

/**
 * Create commands to establish a new tab group
 */
export function createTabGroupCommands(
  name: string,
  color: TabGroupColor,
  tabs: TabInput[]
): SessionCommand[] {
  const commands: SessionCommand[] = [];
  const token = generateGroupToken();
  const windowId = generateSessionId();

  // Command 27: set_tab_group_metadata2
  // Format: pickle_size(4) + token_high(8) + token_low(8) + title(string16) + color(4)
  {
    const titleEncoded = encodeString16(name);
    const payloadSize = 8 + 8 + titleEncoded.length + 4;
    const payload = new Uint8Array(4 + payloadSize);
    const view = new DataView(payload.buffer);

    let offset = 0;
    view.setUint32(offset, payloadSize, true);
    offset += 4;
    view.setBigUint64(offset, token.high, true);
    offset += 8;
    view.setBigUint64(offset, token.low, true);
    offset += 8;
    payload.set(titleEncoded, offset);
    offset += titleEncoded.length;
    view.setUint32(offset, COLOR_IDS[color], true);

    commands.push({ id: 27, data: payload });
  }

  // For each tab, create:
  // - Command 0: set_tab_window (assign tab to window)
  // - Command 6: update_tab_navigation (set URL and title)
  // - Command 25: set_tab_group (assign tab to group)
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const tabId = generateSessionId();

    // Command 0: set_tab_window
    {
      const payload = new Uint8Array(12);
      const view = new DataView(payload.buffer);
      view.setUint32(0, 8, true); // pickle size
      view.setUint32(4, tabId, true); // tab_id
      view.setUint32(8, windowId, true); // window_id
      commands.push({ id: 0, data: payload });
    }

    // Command 2: set_tab_index_in_window
    {
      const payload = new Uint8Array(12);
      const view = new DataView(payload.buffer);
      view.setUint32(0, 8, true); // pickle size
      view.setUint32(4, tabId, true); // tab_id
      view.setUint32(8, i, true); // index
      commands.push({ id: 2, data: payload });
    }

    // Command 6: update_tab_navigation (simplified)
    {
      const urlEncoded = encodeString16(tab.url);
      const titleEncoded = encodeString16(tab.title);
      const payloadSize = 4 + 4 + urlEncoded.length + titleEncoded.length;
      const payload = new Uint8Array(4 + payloadSize);
      const view = new DataView(payload.buffer);

      let offset = 0;
      view.setUint32(offset, payloadSize, true);
      offset += 4;
      view.setUint32(offset, tabId, true);
      offset += 4;
      view.setUint32(offset, 0, true); // navigation_index
      offset += 4;
      payload.set(urlEncoded, offset);
      offset += urlEncoded.length;
      payload.set(titleEncoded, offset);

      commands.push({ id: 6, data: payload });
    }

    // Command 25: set_tab_group
    {
      const payload = new Uint8Array(24);
      const view = new DataView(payload.buffer);
      view.setUint32(0, 20, true); // pickle size
      view.setUint32(4, tabId, true); // tab_id
      view.setBigUint64(8, token.high, true);
      view.setBigUint64(16, token.low, true);
      commands.push({ id: 25, data: payload });
    }
  }

  return commands;
}

/**
 * Serialize a command to binary format
 */
export function serializeCommand(command: SessionCommand): Uint8Array {
  // Format: size(2) + id(1) + data
  const size = 1 + command.data.length; // id + data
  const result = new Uint8Array(2 + size);
  const view = new DataView(result.buffer);

  view.setUint16(0, size, true);
  result[2] = command.id;
  result.set(command.data, 3);

  return result;
}

/**
 * Append commands to a session file
 */
export async function appendToSessionFile(
  path: string,
  commands: SessionCommand[]
): Promise<void> {
  const file = Bun.file(path);
  const existing = await file.arrayBuffer();
  const existingBytes = new Uint8Array(existing);

  // Serialize all commands
  const serializedCommands = commands.map(serializeCommand);
  const totalNewSize = serializedCommands.reduce((sum, c) => sum + c.length, 0);

  // Create new buffer
  const newBuffer = new Uint8Array(existingBytes.length + totalNewSize);
  newBuffer.set(existingBytes, 0);

  let offset = existingBytes.length;
  for (const cmd of serializedCommands) {
    newBuffer.set(cmd, offset);
    offset += cmd.length;
  }

  await Bun.write(path, newBuffer);
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/snss/writer.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/snss/writer.ts src/core/snss/writer.test.ts
git commit -m "feat: add SNSS write operations for tab groups"
```

---

## Task 5: Unpark Command Core Logic

**Files:**
- Create: `src/core/unpark.ts`
- Create: `src/core/unpark.test.ts`

**Step 1: Write the failing test**

Create `src/core/unpark.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { unparkBookmarkFolder, UnparkOptions } from "./unpark";
import { getProfiles } from "./profiles";
import { readBookmarks, findFolder } from "./bookmarks";

describe("unparkBookmarkFolder", () => {
  test("converts bookmark folder to tab group commands", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    // Find first folder with bookmarks
    const bar = bookmarks.roots.bookmark_bar;
    const folder = bar.children.find(
      (c) => c.type === "folder" && c.children.some((ch) => ch.type === "url")
    );

    if (!folder || folder.type !== "folder") {
      console.log("No bookmark folder with URLs found, skipping test");
      return;
    }

    const options: UnparkOptions = {
      dryRun: true,
      color: "blue",
    };

    const result = await unparkBookmarkFolder(
      defaultProfile,
      folder.name,
      options
    );

    expect(result).toHaveProperty("groupName");
    expect(result).toHaveProperty("tabCount");
    expect(result.groupName).toBe(folder.name);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/unpark.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/unpark.ts`:
```typescript
import type { Profile, TabGroupColor, BookmarkFolder } from "../types";
import { readBookmarks, findFolder, flattenBookmarks } from "./bookmarks";
import { getLatestSessionFile } from "./sessions";
import { createTabGroupCommands, appendToSessionFile } from "./snss/writer";
import { createBackup } from "./backup";
import { assertBraveNotRunning } from "./brave";

export interface UnparkOptions {
  /** Tab group color (default: grey) */
  color?: TabGroupColor;
  /** Don't actually write, just simulate */
  dryRun?: boolean;
  /** Skip backup creation */
  noBackup?: boolean;
}

export interface UnparkResult {
  /** Name of the created tab group */
  groupName: string;
  /** Number of tabs in the group */
  tabCount: number;
  /** Path to backup file (if created) */
  backupPath?: string;
}

/**
 * Unpark a bookmark folder as a tab group
 */
export async function unparkBookmarkFolder(
  profile: Profile,
  folderPath: string,
  options: UnparkOptions = {}
): Promise<UnparkResult> {
  const { color = "grey", dryRun = false, noBackup = false } = options;

  // Check Brave is not running (unless dry run)
  if (!dryRun) {
    await assertBraveNotRunning();
  }

  // Read bookmarks and find the folder
  const bookmarks = await readBookmarks(profile);
  const folder = findFolder(bookmarks.roots.bookmark_bar, folderPath);

  if (!folder) {
    throw new Error(`Bookmark folder not found: ${folderPath}`);
  }

  // Get all bookmarks (URLs) in the folder
  const urls = flattenBookmarks(folder);

  if (urls.length === 0) {
    throw new Error(`Bookmark folder is empty: ${folderPath}`);
  }

  // Get the latest session file
  const sessionFile = await getLatestSessionFile(profile, "Session");
  if (!sessionFile) {
    throw new Error("No session file found. Make sure Brave has been opened at least once.");
  }

  // Create tab group commands
  const tabs = urls.map((b) => ({
    url: b.url,
    title: b.name,
  }));

  const commands = createTabGroupCommands(folder.name, color, tabs);

  // Write changes (unless dry run)
  let backupPath: string | undefined;

  if (!dryRun) {
    // Create backup first
    if (!noBackup) {
      backupPath = await createBackup(sessionFile.path, "session");
    }

    // Append commands to session file
    await appendToSessionFile(sessionFile.path, commands);
  }

  return {
    groupName: folder.name,
    tabCount: urls.length,
    backupPath,
  };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/unpark.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/unpark.ts src/core/unpark.test.ts
git commit -m "feat: add unpark command core logic"
```

---

## Task 6: CLI Park Command

**Files:**
- Create: `src/cli/park.ts`
- Modify: `src/index.ts`

**Step 1: Create park command**

Create `src/cli/park.ts`:
```typescript
import { Command } from "commander";
import { getProfiles, resolveProfile } from "../core/profiles";
import { parkTabGroup, getDefaultParkedFolder } from "../core/park";
import { unparkBookmarkFolder } from "../core/unpark";
import { isBraveRunning } from "../core/brave";
import type { Profile, TabGroupColor } from "../types";

async function getTargetProfile(profileName?: string): Promise<Profile> {
  if (profileName) {
    const profile = await resolveProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }
    return profile;
  }

  const profiles = await getProfiles();
  return profiles[0];
}

export const parkCommand = new Command("park")
  .description("Save a tab group as a bookmark folder")
  .argument("<group-name>", "Name of the tab group to park")
  .option("-p, --profile <name>", "Profile name or directory")
  .option("-t, --to <folder>", "Destination bookmark folder path")
  .option("--dry-run", "Show what would happen without making changes")
  .option("--no-backup", "Skip creating backup before changes")
  .action(async (groupName: string, options) => {
    // Check if Brave is running
    if (await isBraveRunning()) {
      console.error("❌ Error: Brave browser must be closed to park tab groups.");
      console.error("   Please close Brave and try again.");
      process.exit(1);
    }

    const profile = await getTargetProfile(options.profile);

    console.log(`Parking tab group "${groupName}"...`);

    if (options.dryRun) {
      console.log("(dry run - no changes will be made)\n");
    }

    try {
      const result = await parkTabGroup(profile, groupName, {
        destination: options.to,
        dryRun: options.dryRun,
        noBackup: !options.backup,
      });

      console.log(`✅ Parked "${groupName}" to bookmarks`);
      console.log(`   📁 ${result.folderPath}`);
      console.log(`   🔗 ${result.bookmarkCount} bookmark(s) created`);

      if (result.backupPath) {
        console.log(`   💾 Backup: ${result.backupPath}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

export const unparkCommand = new Command("unpark")
  .description("Restore a bookmark folder as a tab group")
  .argument("<folder-path>", "Path to the bookmark folder")
  .option("-p, --profile <name>", "Profile name or directory")
  .option(
    "-c, --color <color>",
    "Tab group color (grey, blue, red, yellow, green, pink, purple, cyan, orange)",
    "grey"
  )
  .option("--dry-run", "Show what would happen without making changes")
  .option("--no-backup", "Skip creating backup before changes")
  .action(async (folderPath: string, options) => {
    // Check if Brave is running
    if (await isBraveRunning()) {
      console.error("❌ Error: Brave browser must be closed to unpark bookmarks.");
      console.error("   Please close Brave and try again.");
      process.exit(1);
    }

    // Validate color
    const validColors = [
      "grey",
      "blue",
      "red",
      "yellow",
      "green",
      "pink",
      "purple",
      "cyan",
      "orange",
    ];
    if (!validColors.includes(options.color)) {
      console.error(`❌ Invalid color: ${options.color}`);
      console.error(`   Valid colors: ${validColors.join(", ")}`);
      process.exit(1);
    }

    const profile = await getTargetProfile(options.profile);

    console.log(`Unparking bookmark folder "${folderPath}"...`);

    if (options.dryRun) {
      console.log("(dry run - no changes will be made)\n");
    }

    try {
      const result = await unparkBookmarkFolder(profile, folderPath, {
        color: options.color as TabGroupColor,
        dryRun: options.dryRun,
        noBackup: !options.backup,
      });

      console.log(`✅ Created tab group "${result.groupName}"`);
      console.log(`   🗂️  ${result.tabCount} tab(s) will open on next Brave launch`);
      console.log(`   🎨 Color: ${options.color}`);

      if (result.backupPath) {
        console.log(`   💾 Backup: ${result.backupPath}`);
      }

      console.log("\n   Open Brave to see the new tab group.");
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });
```

**Step 2: Wire up to main CLI**

Update `src/index.ts`:
```typescript
#!/usr/bin/env bun
import { Command } from "commander";
import { profilesCommand } from "./cli/profiles";
import { bookmarksCommand } from "./cli/bookmarks";
import { groupsCommand } from "./cli/groups";
import { parkCommand, unparkCommand } from "./cli/park";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.addCommand(profilesCommand);
program.addCommand(bookmarksCommand);
program.addCommand(groupsCommand);
program.addCommand(parkCommand);
program.addCommand(unparkCommand);

program.parse();
```

**Step 3: Test commands manually**

Run:
```bash
bun run src/index.ts park --help
bun run src/index.ts unpark --help

# Dry run tests (safe)
bun run src/index.ts park "SomeGroup" --dry-run
bun run src/index.ts unpark "SomeFolder" --dry-run --color blue
```

**Step 4: Commit**

```bash
git add src/cli/park.ts src/index.ts
git commit -m "feat: add park and unpark CLI commands"
```

---

## Task 7: Update Core Index

**Files:**
- Modify: `src/core/index.ts`

**Step 1: Add new exports**

Update `src/core/index.ts`:
```typescript
export * from "./brave";
export * from "./profiles";
export * from "./bookmarks";
export * from "./sessions";
export * from "./groups";
export * from "./backup";
export * from "./park";
export * from "./unpark";
```

**Step 2: Commit**

```bash
git add src/core/index.ts
git commit -m "chore: export park/unpark from core"
```

---

## Task 8: Run All Tests

**Step 1: Run full test suite**

Run:
```bash
bun test
```

Expected: All tests pass

**Step 2: Run typecheck**

Run:
```bash
bun run typecheck
```

Expected: No type errors

**Step 3: Manual integration test**

Run:
```bash
# Full help
bun run src/index.ts --help

# Dry run the full workflow
bun run src/index.ts groups
bun run src/index.ts park "SomeGroup" --dry-run
bun run src/index.ts bookmarks
bun run src/index.ts unpark "SomeFolder" --dry-run
```

---

## Task 9: Documentation Update

**Files:**
- Modify: `docs/plans/2026-02-05-bgm-design.md`

**Step 1: Update design doc with Phase 3 completion**

Update the Phase 3 section:
```markdown
### Phase 3 - The Key Feature ✅

- [x] `bgm park` - Tab group → Bookmark folder
- [x] `bgm unpark` - Bookmark folder → Tab group
- [x] Backup system
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-05-bgm-design.md
git commit -m "docs: mark Phase 3 as complete"
```

---

## Task 10: End-to-End Test

This task requires manual testing with Brave browser.

**Step 1: Create a test tab group in Brave**

1. Open Brave
2. Create a new tab group with 2-3 tabs
3. Name it "Test Group"
4. Close Brave completely

**Step 2: Park the group**

Run:
```bash
bun run src/index.ts groups
bun run src/index.ts park "Test Group"
bun run src/index.ts bookmarks show "Parked Groups/Test Group"
```

Expected: Group appears as bookmark folder

**Step 3: Open Brave and verify**

1. Open Brave
2. Check bookmarks - "Parked Groups/Test Group" should exist
3. Close Brave

**Step 4: Unpark the group**

Run:
```bash
bun run src/index.ts unpark "Parked Groups/Test Group" --color blue
```

**Step 5: Open Brave and verify**

1. Open Brave
2. A new tab group "Test Group" should appear
3. It should contain the same URLs as the bookmarks

**Step 6: Document any issues**

If anything doesn't work, note the issue for debugging.

---

## Summary

After completing all tasks, you'll have the full `bgm` tool:

```bash
# List profiles
bgm profiles

# List bookmarks and groups
bgm bookmarks
bgm groups

# Park a tab group
bgm park "Research" --to "Projects"

# Unpark a bookmark folder
bgm unpark "Projects/Research" --color blue
```

The tool provides safe file modification with automatic backups and dry-run mode.
