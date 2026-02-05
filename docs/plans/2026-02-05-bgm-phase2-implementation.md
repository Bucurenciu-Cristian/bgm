# bgm Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Parse SNSS session files to read tab groups - list groups, show tabs in groups.

**Architecture:** Use Kaitai Struct to generate TypeScript parser from `.ksy` schema. The schema is based on [@mblsha/chrome-session](https://observablehq.com/@mblsha/chrome-session) Observable notebook which has working tab group support.

**Tech Stack:** Bun, TypeScript, kaitai-struct-compiler, kaitai-struct runtime

---

## Background: SNSS Format

Chrome/Brave 86+ stores sessions in `Sessions/` directory with timestamp-based files:
- `Session_<timestamp>` - Window/tab structure
- `Tabs_<timestamp>` - Tab navigation history
- `Apps_<timestamp>` - PWA/app state

Files start with `SNSS` magic bytes followed by version (currently 3).

**Tab group commands:**
- Command 25: `set_tab_group` - Associates tab with group (tab_id, token_high, token_low)
- Command 26: `set_tab_group_metadata` - Group metadata (token, title, color)
- Command 27: `set_tab_group_metadata2` - Updated metadata format

---

## Task 1: Install Kaitai Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add Kaitai Struct runtime**

Run:
```bash
bun add kaitai-struct
```

**Step 2: Add dev dependency for schema compilation**

Run:
```bash
bun add -d kaitai-struct-compiler
```

**Step 3: Verify installation**

Run:
```bash
bun run -e "import KaitaiStream from 'kaitai-struct/KaitaiStream'; console.log('OK')"
```

Expected: "OK"

**Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add kaitai-struct dependencies"
```

---

## Task 2: Create Kaitai Schema

**Files:**
- Create: `src/core/snss/chrome-session.ksy`

**Step 1: Create the Kaitai schema**

Create `src/core/snss/chrome-session.ksy`:
```yaml
meta:
  id: chrome_session
  title: Chromium Session File
  file-extension: snss
  endian: le

seq:
  - id: magic
    contents: SNSS
  - id: version
    type: u4
  - id: commands
    type: command
    repeat: eos

types:
  command:
    seq:
      - id: size
        type: u2
      - id: id
        type: u1
        enum: command_type
      - id: body
        size: size - 1
        type:
          switch-on: id
          cases:
            'command_type::set_tab_window': set_tab_window
            'command_type::set_tab_index_in_window': set_tab_index_in_window
            'command_type::set_tab_group': set_tab_group
            'command_type::set_tab_group_metadata2': set_tab_group_metadata
            'command_type::update_tab_navigation': update_tab_navigation
            'command_type::set_selected_navigation_index': set_selected_navigation_index
            'command_type::set_selected_tab_in_index': set_selected_tab_in_index
            'command_type::set_window_type': set_window_type
            'command_type::set_pinned_state': set_pinned_state
            'command_type::set_window_bounds3': set_window_bounds3
            'command_type::tab_closed': tab_closed
            'command_type::window_closed': window_closed
            'command_type::set_active_window': set_active_window

  # Basic types
  session_id:
    seq:
      - id: value
        type: u4

  cr_string16:
    doc: Chrome's string16 format (length-prefixed UTF-16LE)
    seq:
      - id: length
        type: u4
      - id: data
        size: length * 2
        type: str
        encoding: UTF-16LE

  # Command bodies
  set_tab_window:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: window_id
        type: session_id

  set_tab_index_in_window:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: index
        type: u4

  set_tab_group:
    doc: Associates a tab with a tab group
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: token_high
        type: u8
      - id: token_low
        type: u8

  set_tab_group_metadata:
    doc: Tab group metadata (title, color)
    seq:
      - id: pickle_size
        type: u4
      - id: token_high
        type: u8
      - id: token_low
        type: u8
      - id: title
        type: cr_string16
      - id: color
        type: u4
        enum: tab_group_color

  update_tab_navigation:
    doc: Tab URL and title from navigation entry
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: navigation_index
        type: u4
      - id: url
        type: cr_string16
      - id: title
        type: cr_string16
      # Additional fields exist but we only need URL and title

  set_selected_navigation_index:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: index
        type: u4

  set_selected_tab_in_index:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: index
        type: u4

  set_window_type:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: window_type
        type: u4

  set_pinned_state:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: is_pinned
        type: u1

  set_window_bounds3:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: x
        type: s4
      - id: y
        type: s4
      - id: width
        type: s4
      - id: height
        type: s4
      - id: show_state
        type: u4

  tab_closed:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: close_time
        type: u8

  window_closed:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: close_time
        type: u8

  set_active_window:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id

enums:
  command_type:
    0: set_tab_window
    2: set_tab_index_in_window
    6: update_tab_navigation
    7: set_selected_navigation_index
    8: set_selected_tab_in_index
    9: set_window_type
    12: set_pinned_state
    14: set_window_bounds3
    16: tab_closed
    17: window_closed
    20: set_active_window
    25: set_tab_group
    26: set_tab_group_metadata
    27: set_tab_group_metadata2

  tab_group_color:
    0: grey
    1: blue
    2: red
    3: yellow
    4: green
    5: pink
    6: purple
    7: cyan
    8: orange
```

**Step 2: Commit**

```bash
mkdir -p src/core/snss
git add src/core/snss/chrome-session.ksy
git commit -m "feat: add Kaitai schema for SNSS session files"
```

---

## Task 3: Generate TypeScript Parser

**Files:**
- Create: `src/core/snss/ChromeSession.ts` (generated)
- Create: `scripts/generate-parser.ts`

**Step 1: Create generator script**

Create `scripts/generate-parser.ts`:
```typescript
import { execSync } from "child_process";
import { join } from "path";

const schemaPath = join(import.meta.dir, "../src/core/snss/chrome-session.ksy");
const outputDir = join(import.meta.dir, "../src/core/snss");

console.log("Generating TypeScript parser from Kaitai schema...");

try {
  execSync(
    `kaitai-struct-compiler -t javascript --outdir "${outputDir}" "${schemaPath}"`,
    { stdio: "inherit" }
  );
  console.log("Parser generated successfully!");
} catch (error) {
  console.error("Failed to generate parser. Make sure kaitai-struct-compiler is installed:");
  console.error("  brew install kaitai-struct-compiler  # macOS");
  console.error("  yay -S kaitai-struct-compiler        # Arch Linux");
  process.exit(1);
}
```

**Step 2: Install kaitai-struct-compiler system-wide**

Run:
```bash
yay -S kaitai-struct-compiler
```

**Step 3: Add generate script to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "generate:parser": "bun run scripts/generate-parser.ts"
  }
}
```

**Step 4: Generate the parser**

Run:
```bash
bun run generate:parser
```

Expected: Creates `src/core/snss/ChromeSession.js`

**Step 5: Commit**

```bash
git add scripts/generate-parser.ts src/core/snss/ChromeSession.js package.json
git commit -m "feat: generate SNSS parser from Kaitai schema"
```

---

## Task 4: Session File Discovery

**Files:**
- Create: `src/core/sessions.ts`
- Create: `src/core/sessions.test.ts`

**Step 1: Write the failing test**

Create `src/core/sessions.test.ts`:
```typescript
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

    const file = files[0];
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/sessions.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/sessions.ts`:
```typescript
import { join } from "path";
import { readdir } from "fs/promises";
import type { Profile } from "../types";

export interface SessionFile {
  path: string;
  type: "Session" | "Tabs" | "Apps";
  timestamp: number;
  filename: string;
}

/**
 * Get all session files for a profile
 */
export async function getSessionFiles(profile: Profile): Promise<SessionFile[]> {
  const sessionsDir = join(profile.path, "Sessions");

  try {
    const entries = await readdir(sessionsDir);
    const files: SessionFile[] = [];

    for (const entry of entries) {
      const match = entry.match(/^(Session|Tabs|Apps)_(\d+)$/);
      if (match) {
        files.push({
          path: join(sessionsDir, entry),
          type: match[1] as SessionFile["type"],
          timestamp: parseInt(match[2]),
          filename: entry,
        });
      }
    }

    // Sort by timestamp descending (newest first)
    files.sort((a, b) => b.timestamp - a.timestamp);
    return files;
  } catch (error) {
    // Sessions directory might not exist
    return [];
  }
}

/**
 * Get the latest session file of a specific type
 */
export async function getLatestSessionFile(
  profile: Profile,
  type: SessionFile["type"]
): Promise<SessionFile | undefined> {
  const files = await getSessionFiles(profile);
  return files.find((f) => f.type === type);
}

/**
 * Get the Sessions directory path for a profile
 */
export function getSessionsDir(profile: Profile): string {
  return join(profile.path, "Sessions");
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/sessions.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/sessions.ts src/core/sessions.test.ts
git commit -m "feat: add session file discovery"
```

---

## Task 5: SNSS Parser Wrapper

**Files:**
- Create: `src/core/snss/parser.ts`
- Create: `src/core/snss/parser.test.ts`

**Step 1: Write the failing test**

Create `src/core/snss/parser.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test src/core/snss/parser.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/core/snss/parser.ts`:
```typescript
import KaitaiStream from "kaitai-struct/KaitaiStream";

// Import generated parser (we'll handle this dynamically)
// @ts-ignore - generated file
import ChromeSession from "./ChromeSession.js";

export interface ParsedCommand {
  id: number;
  size: number;
  body: unknown;
}

export interface ParsedSession {
  version: number;
  commands: ParsedCommand[];
}

/**
 * Parse an SNSS session file
 */
export async function parseSessionFile(path: string): Promise<ParsedSession> {
  const file = Bun.file(path);
  const buffer = await file.arrayBuffer();
  const stream = new KaitaiStream(buffer);

  try {
    const parsed = new ChromeSession(stream);

    return {
      version: parsed.version,
      commands: parsed.commands.map((cmd: any) => ({
        id: cmd.id,
        size: cmd.size,
        body: cmd.body,
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse session file ${path}: ${error}`);
  }
}

/**
 * Check if a file is a valid SNSS file
 */
export async function isValidSnssFile(path: string): Promise<boolean> {
  try {
    const file = Bun.file(path);
    const buffer = await file.arrayBuffer();
    const view = new Uint8Array(buffer);

    // Check SNSS magic bytes
    return (
      view[0] === 0x53 && // S
      view[1] === 0x4e && // N
      view[2] === 0x53 && // S
      view[3] === 0x53    // S
    );
  } catch {
    return false;
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test src/core/snss/parser.test.ts
```

Expected: PASS (or skip if Kaitai parser has issues - we'll debug)

**Step 5: Commit**

```bash
git add src/core/snss/parser.ts src/core/snss/parser.test.ts
git commit -m "feat: add SNSS parser wrapper"
```

---

## Task 6: Tab Groups Extraction

**Files:**
- Create: `src/core/groups.ts`
- Create: `src/core/groups.test.ts`
- Modify: `src/types.ts`

**Step 1: Add tab group types**

Add to `src/types.ts`:
```typescript
/**
 * Tab group color options
 */
export type TabGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange";

/**
 * A tab within a group
 */
export interface Tab {
  id: number;
  url: string;
  title: string;
  index: number;
}

/**
 * A tab group from the session
 */
export interface TabGroup {
  /** Unique token for the group (high + low combined) */
  token: string;
  /** Display name */
  name: string;
  /** Group color */
  color: TabGroupColor;
  /** Tabs in this group */
  tabs: Tab[];
}
```

**Step 2: Write the failing test**

Create `src/core/groups.test.ts`:
```typescript
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

    const group = groups[0];
    expect(group).toHaveProperty("token");
    expect(group).toHaveProperty("name");
    expect(group).toHaveProperty("color");
    expect(group).toHaveProperty("tabs");
    expect(Array.isArray(group.tabs)).toBe(true);
  });
});
```

**Step 3: Run test to verify it fails**

Run:
```bash
bun test src/core/groups.test.ts
```

Expected: FAIL - module not found

**Step 4: Write implementation**

Create `src/core/groups.ts`:
```typescript
import type { Profile, TabGroup, Tab, TabGroupColor } from "../types";
import { getLatestSessionFile } from "./sessions";
import { parseSessionFile } from "./snss/parser";

const COLOR_MAP: Record<number, TabGroupColor> = {
  0: "grey",
  1: "blue",
  2: "red",
  3: "yellow",
  4: "green",
  5: "pink",
  6: "purple",
  7: "cyan",
  8: "orange",
};

interface GroupMetadata {
  tokenHigh: bigint;
  tokenLow: bigint;
  name: string;
  color: TabGroupColor;
}

interface TabGroupAssignment {
  tabId: number;
  tokenHigh: bigint;
  tokenLow: bigint;
}

interface TabNavigation {
  tabId: number;
  url: string;
  title: string;
  index: number;
}

/**
 * Create a unique token string from high/low parts
 */
function makeToken(high: bigint, low: bigint): string {
  return `${high.toString(16)}-${low.toString(16)}`;
}

/**
 * Get all tab groups for a profile
 */
export async function getTabGroups(profile: Profile): Promise<TabGroup[]> {
  const sessionFile = await getLatestSessionFile(profile, "Session");
  if (!sessionFile) {
    return [];
  }

  const session = await parseSessionFile(sessionFile.path);

  // Collect group metadata (command 26 or 27)
  const groupMetadata = new Map<string, GroupMetadata>();

  // Collect tab-to-group assignments (command 25)
  const tabAssignments: TabGroupAssignment[] = [];

  // Collect tab navigation info (command 6)
  const tabNavigations = new Map<number, TabNavigation>();

  // Collect tab window assignments (command 0)
  const tabWindows = new Map<number, number>();

  // Collect tab indices (command 2)
  const tabIndices = new Map<number, number>();

  for (const cmd of session.commands) {
    const body = cmd.body as any;

    switch (cmd.id) {
      case 0: // set_tab_window
        if (body?.tabId?.value !== undefined && body?.windowId?.value !== undefined) {
          tabWindows.set(body.tabId.value, body.windowId.value);
        }
        break;

      case 2: // set_tab_index_in_window
        if (body?.tabId?.value !== undefined && body?.index !== undefined) {
          tabIndices.set(body.tabId.value, body.index);
        }
        break;

      case 6: // update_tab_navigation
        if (body?.tabId?.value !== undefined) {
          tabNavigations.set(body.tabId.value, {
            tabId: body.tabId.value,
            url: body.url || "",
            title: body.title || "",
            index: body.navigationIndex || 0,
          });
        }
        break;

      case 25: // set_tab_group
        if (body?.tabId?.value !== undefined) {
          tabAssignments.push({
            tabId: body.tabId.value,
            tokenHigh: BigInt(body.tokenHigh || 0),
            tokenLow: BigInt(body.tokenLow || 0),
          });
        }
        break;

      case 26: // set_tab_group_metadata
      case 27: // set_tab_group_metadata2
        if (body?.tokenHigh !== undefined && body?.tokenLow !== undefined) {
          const token = makeToken(BigInt(body.tokenHigh), BigInt(body.tokenLow));
          groupMetadata.set(token, {
            tokenHigh: BigInt(body.tokenHigh),
            tokenLow: BigInt(body.tokenLow),
            name: body.title || "Unnamed Group",
            color: COLOR_MAP[body.color] || "grey",
          });
        }
        break;
    }
  }

  // Build groups from metadata
  const groups: TabGroup[] = [];

  for (const [token, metadata] of groupMetadata) {
    // Find tabs assigned to this group
    const assignedTabs = tabAssignments.filter(
      (a) =>
        makeToken(a.tokenHigh, a.tokenLow) === token
    );

    const tabs: Tab[] = assignedTabs
      .map((assignment) => {
        const nav = tabNavigations.get(assignment.tabId);
        const index = tabIndices.get(assignment.tabId) ?? 0;

        return {
          id: assignment.tabId,
          url: nav?.url || "",
          title: nav?.title || "Unknown",
          index,
        };
      })
      .filter((t) => t.url) // Only include tabs with URLs
      .sort((a, b) => a.index - b.index);

    groups.push({
      token,
      name: metadata.name,
      color: metadata.color,
      tabs,
    });
  }

  // Sort groups by name
  groups.sort((a, b) => a.name.localeCompare(b.name));

  return groups;
}

/**
 * Get a specific tab group by name
 */
export async function getTabGroupByName(
  profile: Profile,
  name: string
): Promise<TabGroup | undefined> {
  const groups = await getTabGroups(profile);
  const lowerName = name.toLowerCase();
  return groups.find((g) => g.name.toLowerCase() === lowerName);
}
```

**Step 5: Run test to verify it passes**

Run:
```bash
bun test src/core/groups.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/core/groups.ts src/core/groups.test.ts src/types.ts
git commit -m "feat: add tab group extraction from session files"
```

---

## Task 7: CLI Groups Command

**Files:**
- Create: `src/cli/groups.ts`
- Modify: `src/index.ts`

**Step 1: Create groups command**

Create `src/cli/groups.ts`:
```typescript
import { Command } from "commander";
import { getProfiles, resolveProfile } from "../core/profiles";
import { getTabGroups, getTabGroupByName } from "../core/groups";
import { isBraveRunning } from "../core/brave";
import type { Profile } from "../types";

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

export const groupsCommand = new Command("groups")
  .description("List and manage tab groups")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (options) => {
    // Warn if Brave is running (data might be stale)
    if (await isBraveRunning()) {
      console.log(
        "⚠️  Brave is running - showing last saved session state\n"
      );
    }

    const profile = await getTargetProfile(options.profile);
    const groups = await getTabGroups(profile);

    console.log(`Tab groups for profile: ${profile.name}\n`);

    if (groups.length === 0) {
      console.log("  (no tab groups found)");
      console.log("\n  Note: Tab groups only appear after closing and reopening Brave.");
    } else {
      for (const group of groups) {
        const colorEmoji = getColorEmoji(group.color);
        console.log(`  ${colorEmoji} ${group.name} (${group.tabs.length} tabs)`);
      }
    }

    console.log(`\nTotal: ${groups.length} group(s)`);
  });

// Subcommand: show group contents
groupsCommand
  .command("show <name>")
  .description("Show tabs in a group")
  .option("-p, --profile <name>", "Profile name or directory")
  .action(async (name: string, options) => {
    const profile = await getTargetProfile(options.profile);
    const group = await getTabGroupByName(profile, name);

    if (!group) {
      console.error(`Tab group not found: ${name}`);
      process.exit(1);
    }

    const colorEmoji = getColorEmoji(group.color);
    console.log(`${colorEmoji} ${group.name}\n`);

    if (group.tabs.length === 0) {
      console.log("  (no tabs)");
    } else {
      for (const tab of group.tabs) {
        console.log(`  • ${tab.title}`);
        console.log(`    ${tab.url}\n`);
      }
    }
  });

function getColorEmoji(color: string): string {
  const colors: Record<string, string> = {
    grey: "⚪",
    blue: "🔵",
    red: "🔴",
    yellow: "🟡",
    green: "🟢",
    pink: "🩷",
    purple: "🟣",
    cyan: "🩵",
    orange: "🟠",
  };
  return colors[color] || "⚪";
}
```

**Step 2: Wire up to main CLI**

Update `src/index.ts`:
```typescript
#!/usr/bin/env bun
import { Command } from "commander";
import { profilesCommand } from "./cli/profiles";
import { bookmarksCommand } from "./cli/bookmarks";
import { groupsCommand } from "./cli/groups";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.addCommand(profilesCommand);
program.addCommand(bookmarksCommand);
program.addCommand(groupsCommand);

program.parse();
```

**Step 3: Test commands manually**

Run:
```bash
bun run src/index.ts groups
bun run src/index.ts groups -p "Personal"
bun run src/index.ts groups show "SomeGroupName"
```

Expected: Lists groups and shows group contents

**Step 4: Commit**

```bash
git add src/cli/groups.ts src/index.ts
git commit -m "feat: add groups list and show commands"
```

---

## Task 8: Update Core Index

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
```

**Step 2: Commit**

```bash
git add src/core/index.ts
git commit -m "chore: export sessions and groups from core"
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

**Step 3: Manual integration test**

Run:
```bash
# List all commands
bun run src/index.ts --help

# Test each command
bun run src/index.ts profiles
bun run src/index.ts bookmarks
bun run src/index.ts groups
```

**Step 4: Fix any issues and commit**

---

## Task 10: Documentation Update

**Files:**
- Modify: `docs/plans/2026-02-05-bgm-design.md`

**Step 1: Update design doc with Phase 2 completion**

Update the Phase 2 section:
```markdown
### Phase 2 - Tab Groups ✅

- [x] SNSS session file parsing (Kaitai Struct)
- [x] Tab group listing and reading
- [x] Tab group metadata (name, color, tabs)
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-05-bgm-design.md
git commit -m "docs: mark Phase 2 as complete"
```

---

## Troubleshooting

### Kaitai Parser Issues

If the generated parser fails:

1. **Check SNSS version** - Brave may use a newer format
   ```bash
   hexdump -C Sessions/Session_* | head -10
   ```

2. **Fallback to manual parsing** - If Kaitai is problematic, implement a manual binary parser

3. **Debug with verbose logging** - Add console.log in parser.ts to see what commands are being parsed

### No Tab Groups Found

Tab groups are only persisted when:
1. Brave is closed properly (not killed)
2. The session was saved (happens periodically and on close)

To test:
1. Create a tab group in Brave
2. Close Brave normally
3. Run `bgm groups`

### Parser Type Errors

The generated Kaitai parser may not have proper TypeScript types. Use `any` casts where needed and consider writing type declarations for the generated file.
