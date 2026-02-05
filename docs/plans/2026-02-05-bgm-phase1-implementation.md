# bgm Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation - profile discovery, bookmarks read/write, CLI skeleton, and Brave process detection.

**Architecture:** TypeScript CLI using Bun runtime. Commander.js for subcommands. Core modules separate from CLI layer for testability. XDG paths for config/data storage.

**Tech Stack:** Bun, TypeScript, Commander.js, Vitest (testing)

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`

**Step 1: Initialize Bun project**

Run:
```bash
cd /home/kicky/Work/tries/2026-02-05-brave-cli-groups-bookmarks
bun init -y
```

Expected: Creates `package.json`, `tsconfig.json`, `index.ts`

**Step 2: Update package.json with project metadata**

Edit `package.json`:
```json
{
  "name": "bgm",
  "version": "0.1.0",
  "description": "Brave Groups Manager - CLI tool to manage Brave browser tab groups and bookmarks",
  "type": "module",
  "bin": {
    "bgm": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "dependencies": {}
}
```

**Step 3: Add commander dependency**

Run:
```bash
bun add commander
```

Expected: Adds commander to dependencies

**Step 4: Create basic CLI entry point**

Create `src/index.ts`:
```typescript
#!/usr/bin/env bun
import { Command } from "commander";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.parse();
```

**Step 5: Verify CLI runs**

Run:
```bash
bun run src/index.ts --help
```

Expected: Shows help output with name, description, version

**Step 6: Commit**

```bash
git add package.json tsconfig.json bun.lock src/index.ts
git commit -m "chore: initialize bun project with commander"
```

---

## Task 2: Types Definition

**Files:**
- Create: `src/types.ts`

**Step 1: Create shared types**

Create `src/types.ts`:
```typescript
/**
 * Brave browser profile information
 */
export interface Profile {
  /** Directory name (e.g., "Default", "Profile 1") */
  directory: string;
  /** Display name from Local State (e.g., "Personal", "Work") */
  name: string;
  /** Full path to profile directory */
  path: string;
}

/**
 * Bookmark item (URL)
 */
export interface Bookmark {
  type: "url";
  id: string;
  guid: string;
  name: string;
  url: string;
  dateAdded: number;
  dateLastUsed: number;
}

/**
 * Bookmark folder containing children
 */
export interface BookmarkFolder {
  type: "folder";
  id: string;
  guid: string;
  name: string;
  dateAdded: number;
  dateModified: number;
  children: BookmarkNode[];
}

/**
 * Union type for bookmark tree nodes
 */
export type BookmarkNode = Bookmark | BookmarkFolder;

/**
 * Root structure of Brave's Bookmarks file
 */
export interface BookmarksFile {
  checksum: string;
  roots: {
    bookmark_bar: BookmarkFolder;
    other: BookmarkFolder;
    synced: BookmarkFolder;
  };
  version: number;
}

/**
 * Profile info from Local State file
 */
export interface ProfileInfoCache {
  [directory: string]: {
    name: string;
    avatar_icon: string;
    active_time: number;
    [key: string]: unknown;
  };
}

/**
 * Relevant parts of Local State file
 */
export interface LocalState {
  profile: {
    info_cache: ProfileInfoCache;
    last_used?: string;
  };
}

/**
 * bgm configuration stored in ~/.config/bgm/config.json
 */
export interface BgmConfig {
  defaultProfile?: string;
}
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: Brave Path Detection

**Files:**
- Create: `src/core/brave.ts`
- Create: `src/core/brave.test.ts`

**Step 1: Write the failing test**

Create `src/core/brave.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/brave.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/brave.ts`:
```typescript
import { homedir, platform } from "os";
import { join } from "path";

/**
 * Get the Brave browser data directory for the current platform
 */
export function getBraveDataDir(): string {
  const home = homedir();
  const os = platform();

  switch (os) {
    case "linux":
      return join(home, ".config", "BraveSoftware", "Brave-Browser");
    case "darwin":
      return join(
        home,
        "Library",
        "Application Support",
        "BraveSoftware",
        "Brave-Browser"
      );
    case "win32":
      return join(
        process.env.LOCALAPPDATA || join(home, "AppData", "Local"),
        "BraveSoftware",
        "Brave-Browser",
        "User Data"
      );
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

/**
 * Check if Brave browser is currently running
 */
export async function isBraveRunning(): Promise<boolean> {
  const os = platform();

  try {
    if (os === "win32") {
      const proc = Bun.spawn(["tasklist", "/FI", "IMAGENAME eq brave.exe"]);
      const output = await new Response(proc.stdout).text();
      return output.toLowerCase().includes("brave.exe");
    } else {
      // Linux and macOS
      const proc = Bun.spawn(["pgrep", "-x", "brave"]);
      await proc.exited;
      return proc.exitCode === 0;
    }
  } catch {
    // If pgrep/tasklist fails, assume not running
    return false;
  }
}

/**
 * Assert Brave is not running, throw if it is
 */
export async function assertBraveNotRunning(): Promise<void> {
  if (await isBraveRunning()) {
    throw new Error(
      "Brave browser is running. Please close it before modifying browser data."
    );
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/brave.test.ts
```

Expected: PASS (assuming Brave is installed)

**Step 5: Commit**

```bash
git add src/core/brave.ts src/core/brave.test.ts
git commit -m "feat: add Brave path detection and process checking"
```

---

## Task 4: Profile Discovery

**Files:**
- Create: `src/core/profiles.ts`
- Create: `src/core/profiles.test.ts`

**Step 1: Write the failing test**

Create `src/core/profiles.test.ts`:
```typescript
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
    const firstName = profiles[0].name;
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
    const firstName = profiles[0].name;
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/profiles.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/profiles.ts`:
```typescript
import { join } from "path";
import { getBraveDataDir } from "./brave";
import type { Profile, LocalState } from "../types";

/**
 * Read and parse the Local State file
 */
async function readLocalState(): Promise<LocalState> {
  const braveDir = getBraveDataDir();
  const localStatePath = join(braveDir, "Local State");

  const file = Bun.file(localStatePath);
  if (!(await file.exists())) {
    throw new Error(`Local State file not found at ${localStatePath}`);
  }

  const content = await file.text();
  return JSON.parse(content) as LocalState;
}

/**
 * Get all Brave profiles
 */
export async function getProfiles(): Promise<Profile[]> {
  const braveDir = getBraveDataDir();
  const localState = await readLocalState();
  const infoCache = localState.profile.info_cache;

  const profiles: Profile[] = [];

  for (const [directory, info] of Object.entries(infoCache)) {
    profiles.push({
      directory,
      name: info.name || directory,
      path: join(braveDir, directory),
    });
  }

  // Sort: Default first, then alphabetically by name
  profiles.sort((a, b) => {
    if (a.directory === "Default") return -1;
    if (b.directory === "Default") return 1;
    return a.name.localeCompare(b.name);
  });

  return profiles;
}

/**
 * Find a profile by its display name (case-insensitive)
 */
export async function getProfileByName(
  name: string
): Promise<Profile | undefined> {
  const profiles = await getProfiles();
  const lowerName = name.toLowerCase();
  return profiles.find((p) => p.name.toLowerCase() === lowerName);
}

/**
 * Find a profile by its directory name
 */
export async function getProfileByDirectory(
  directory: string
): Promise<Profile | undefined> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.directory === directory);
}

/**
 * Resolve a profile from user input (name or directory)
 */
export async function resolveProfile(
  nameOrDirectory: string
): Promise<Profile | undefined> {
  // Try by name first, then by directory
  return (
    (await getProfileByName(nameOrDirectory)) ||
    (await getProfileByDirectory(nameOrDirectory))
  );
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/profiles.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/profiles.ts src/core/profiles.test.ts
git commit -m "feat: add profile discovery from Local State"
```

---

## Task 5: Bookmarks Read

**Files:**
- Create: `src/core/bookmarks.ts`
- Create: `src/core/bookmarks.test.ts`

**Step 1: Write the failing test**

Create `src/core/bookmarks.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import {
  readBookmarks,
  getBookmarkBar,
  findFolder,
  flattenBookmarks,
} from "./bookmarks";
import { getProfiles } from "./profiles";

describe("readBookmarks", () => {
  test("reads bookmarks file for default profile", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    expect(bookmarks).toHaveProperty("checksum");
    expect(bookmarks).toHaveProperty("roots");
    expect(bookmarks.roots).toHaveProperty("bookmark_bar");
  });
});

describe("getBookmarkBar", () => {
  test("returns bookmark bar folder", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bar = await getBookmarkBar(defaultProfile);

    expect(bar.type).toBe("folder");
    expect(bar.name).toBe("Bookmarks bar");
  });
});

describe("findFolder", () => {
  test("finds top-level folder", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    // Find the first folder in bookmark bar
    const bar = bookmarks.roots.bookmark_bar;
    const firstFolder = bar.children.find((c) => c.type === "folder");

    if (firstFolder) {
      const found = findFolder(bookmarks.roots.bookmark_bar, firstFolder.name);
      expect(found).toBeDefined();
      expect(found?.name).toBe(firstFolder.name);
    }
  });

  test("finds nested folder by path", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    // Find first nested folder
    const bar = bookmarks.roots.bookmark_bar;
    for (const child of bar.children) {
      if (child.type === "folder" && child.children.length > 0) {
        const nestedFolder = child.children.find((c) => c.type === "folder");
        if (nestedFolder) {
          const path = `${child.name}/${nestedFolder.name}`;
          const found = findFolder(bar, path);
          expect(found).toBeDefined();
          break;
        }
      }
    }
  });
});

describe("flattenBookmarks", () => {
  test("returns flat array of bookmarks", async () => {
    const profiles = await getProfiles();
    const defaultProfile = profiles.find((p) => p.directory === "Default")!;
    const bookmarks = await readBookmarks(defaultProfile);

    const flat = flattenBookmarks(bookmarks.roots.bookmark_bar);
    expect(Array.isArray(flat)).toBe(true);

    // All items should be URLs, not folders
    for (const item of flat) {
      expect(item.type).toBe("url");
      expect(item).toHaveProperty("url");
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/bookmarks.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/bookmarks.ts`:
```typescript
import { join } from "path";
import type {
  Profile,
  BookmarksFile,
  BookmarkFolder,
  BookmarkNode,
  Bookmark,
} from "../types";

/**
 * Read and parse bookmarks file for a profile
 */
export async function readBookmarks(profile: Profile): Promise<BookmarksFile> {
  const bookmarksPath = join(profile.path, "Bookmarks");
  const file = Bun.file(bookmarksPath);

  if (!(await file.exists())) {
    throw new Error(`Bookmarks file not found at ${bookmarksPath}`);
  }

  const content = await file.text();
  const raw = JSON.parse(content);

  // Transform raw JSON to our typed structure
  return {
    checksum: raw.checksum,
    version: raw.version || 1,
    roots: {
      bookmark_bar: transformFolder(raw.roots.bookmark_bar),
      other: transformFolder(raw.roots.other),
      synced: transformFolder(raw.roots.synced),
    },
  };
}

/**
 * Transform raw bookmark node to typed structure
 */
function transformNode(raw: Record<string, unknown>): BookmarkNode {
  if (raw.type === "folder") {
    return transformFolder(raw);
  }
  return transformBookmark(raw);
}

/**
 * Transform raw folder to typed BookmarkFolder
 */
function transformFolder(raw: Record<string, unknown>): BookmarkFolder {
  const children = (raw.children as Record<string, unknown>[]) || [];
  return {
    type: "folder",
    id: raw.id as string,
    guid: raw.guid as string,
    name: raw.name as string,
    dateAdded: parseInt(raw.date_added as string) || 0,
    dateModified: parseInt(raw.date_modified as string) || 0,
    children: children.map(transformNode),
  };
}

/**
 * Transform raw bookmark to typed Bookmark
 */
function transformBookmark(raw: Record<string, unknown>): Bookmark {
  return {
    type: "url",
    id: raw.id as string,
    guid: raw.guid as string,
    name: raw.name as string,
    url: raw.url as string,
    dateAdded: parseInt(raw.date_added as string) || 0,
    dateLastUsed: parseInt(raw.date_last_used as string) || 0,
  };
}

/**
 * Get the bookmark bar folder for a profile
 */
export async function getBookmarkBar(
  profile: Profile
): Promise<BookmarkFolder> {
  const bookmarks = await readBookmarks(profile);
  return bookmarks.roots.bookmark_bar;
}

/**
 * Find a folder by path (e.g., "Projects/ClientX")
 */
export function findFolder(
  root: BookmarkFolder,
  path: string
): BookmarkFolder | undefined {
  const parts = path.split("/").filter(Boolean);

  let current: BookmarkFolder = root;

  for (const part of parts) {
    const found = current.children.find(
      (c): c is BookmarkFolder =>
        c.type === "folder" && c.name.toLowerCase() === part.toLowerCase()
    );

    if (!found) {
      return undefined;
    }
    current = found;
  }

  return current;
}

/**
 * Flatten a folder tree into array of bookmarks (URLs only)
 */
export function flattenBookmarks(folder: BookmarkFolder): Bookmark[] {
  const result: Bookmark[] = [];

  function walk(node: BookmarkNode): void {
    if (node.type === "url") {
      result.push(node);
    } else {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const child of folder.children) {
    walk(child);
  }

  return result;
}

/**
 * Get folder tree as printable structure
 */
export function getFolderTree(
  folder: BookmarkFolder,
  indent: number = 0
): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const child of folder.children) {
    if (child.type === "folder") {
      const count = flattenBookmarks(child).length;
      lines.push(`${prefix}📁 ${child.name} (${count})`);
      lines.push(getFolderTree(child, indent + 1));
    } else {
      lines.push(`${prefix}🔗 ${child.name}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

/**
 * List top-level folders in bookmark bar
 */
export function listFolders(folder: BookmarkFolder): BookmarkFolder[] {
  return folder.children.filter((c): c is BookmarkFolder => c.type === "folder");
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/bookmarks.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/bookmarks.ts src/core/bookmarks.test.ts
git commit -m "feat: add bookmark reading and folder navigation"
```

---

## Task 6: CLI Profiles Command

**Files:**
- Create: `src/cli/profiles.ts`
- Modify: `src/index.ts`

**Step 1: Create profiles command**

Create `src/cli/profiles.ts`:
```typescript
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
```

**Step 2: Wire up to main CLI**

Update `src/index.ts`:
```typescript
#!/usr/bin/env bun
import { Command } from "commander";
import { profilesCommand } from "./cli/profiles";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.addCommand(profilesCommand);

program.parse();
```

**Step 3: Test the command manually**

Run:
```bash
bun run src/index.ts profiles
```

Expected: Lists profiles like:
```
Brave profiles:

  • Personal (Default)
  • ClawdBot AI (Profile 1)
  • ... (Profile 2)

Total: 3 profile(s)
```

**Step 4: Commit**

```bash
git add src/cli/profiles.ts src/index.ts
git commit -m "feat: add profiles list command"
```

---

## Task 7: CLI Bookmarks Command

**Files:**
- Create: `src/cli/bookmarks.ts`
- Modify: `src/index.ts`

**Step 1: Create bookmarks command**

Create `src/cli/bookmarks.ts`:
```typescript
import { Command } from "commander";
import { getProfiles, resolveProfile } from "../core/profiles";
import {
  getBookmarkBar,
  listFolders,
  findFolder,
  getFolderTree,
  flattenBookmarks,
} from "../core/bookmarks";
import type { Profile } from "../types";

async function getTargetProfile(profileName?: string): Promise<Profile> {
  if (profileName) {
    const profile = await resolveProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }
    return profile;
  }

  // Default to first profile
  const profiles = await getProfiles();
  return profiles[0];
}

export const bookmarksCommand = new Command("bookmarks")
  .description("List and manage bookmarks")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (options) => {
    const profile = await getTargetProfile(options.profile);
    const bar = await getBookmarkBar(profile);
    const folders = listFolders(bar);

    console.log(`Bookmarks for profile: ${profile.name}\n`);

    if (folders.length === 0) {
      console.log("  (no folders)");
    } else {
      for (const folder of folders) {
        const count = flattenBookmarks(folder).length;
        console.log(`  📁 ${folder.name} (${count} bookmarks)`);
      }
    }

    // Count items not in folders
    const topLevelUrls = bar.children.filter((c) => c.type === "url");
    if (topLevelUrls.length > 0) {
      console.log(`  🔗 ${topLevelUrls.length} bookmark(s) at root`);
    }
  });

// Subcommand: show folder contents
bookmarksCommand
  .command("show <path>")
  .description("Show contents of a bookmark folder")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (path: string, options) => {
    const profile = await getTargetProfile(options.profile);
    const bar = await getBookmarkBar(profile);
    const folder = findFolder(bar, path);

    if (!folder) {
      console.error(`Folder not found: ${path}`);
      process.exit(1);
    }

    console.log(`📁 ${folder.name}\n`);
    console.log(getFolderTree(folder));
  });
```

**Step 2: Wire up to main CLI**

Update `src/index.ts`:
```typescript
#!/usr/bin/env bun
import { Command } from "commander";
import { profilesCommand } from "./cli/profiles";
import { bookmarksCommand } from "./cli/bookmarks";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.addCommand(profilesCommand);
program.addCommand(bookmarksCommand);

program.parse();
```

**Step 3: Test commands manually**

Run:
```bash
bun run src/index.ts bookmarks
bun run src/index.ts bookmarks show "Facturi"
bun run src/index.ts bookmarks -p "ClawdBot AI"
```

Expected: Lists folders, shows folder contents, works with different profiles

**Step 4: Commit**

```bash
git add src/cli/bookmarks.ts src/index.ts
git commit -m "feat: add bookmarks list and show commands"
```

---

## Task 8: Core Module Index

**Files:**
- Create: `src/core/index.ts`

**Step 1: Create barrel export**

Create `src/core/index.ts`:
```typescript
export * from "./brave";
export * from "./profiles";
export * from "./bookmarks";
```

**Step 2: Commit**

```bash
git add src/core/index.ts
git commit -m "chore: add core module barrel export"
```

---

## Task 9: Run All Tests

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

**Step 3: Final commit if any fixes needed**

---

## Task 10: Documentation Update

**Files:**
- Modify: `docs/plans/2026-02-05-bgm-design.md`

**Step 1: Update design doc with Phase 1 completion**

Add to the Phase 1 section:
```markdown
### Phase 1 - Foundation (MVP) ✅

- [x] Profile discovery and listing
- [x] Bookmarks read (JSON)
- [x] Basic CLI skeleton with commander
- [x] Brave process detection
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-05-bgm-design.md
git commit -m "docs: mark Phase 1 as complete"
```

---

## Summary

After completing all tasks, you'll have:

```
bgm/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── types.ts           # Shared types
│   ├── cli/
│   │   ├── profiles.ts    # profiles command
│   │   └── bookmarks.ts   # bookmarks command
│   └── core/
│       ├── index.ts       # barrel export
│       ├── brave.ts       # path detection, process check
│       ├── brave.test.ts
│       ├── profiles.ts    # profile discovery
│       ├── profiles.test.ts
│       ├── bookmarks.ts   # bookmark reading
│       └── bookmarks.test.ts
├── package.json
├── tsconfig.json
└── docs/plans/
    ├── 2026-02-05-bgm-design.md
    └── 2026-02-05-bgm-phase1-implementation.md
```

Working commands:
```bash
bgm profiles                    # List all profiles
bgm bookmarks                   # List bookmark folders
bgm bookmarks -p "Work"         # For specific profile
bgm bookmarks show "Projects"   # Show folder contents
```
