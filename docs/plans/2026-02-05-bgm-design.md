# bgm - Brave Groups Manager

> CLI tool to manage Brave browser tab groups and bookmarks across profiles

**Status:** Design approved
**Fizzy card:** [#97](https://mac-mini.tail39ab0b.ts.net/1/cards/97)

---

## Problem

Brave syncs across profiles but tab groups get messy. No good way to manage them programmatically. When context-switching between projects, tab groups accumulate and become clutter.

## Solution

A CLI tool (`bgm`) that reads and writes Brave browser data files when the browser is closed. Key feature: convert tab groups to bookmark folders ("park") and restore them later ("unpark").

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data access | Static file parsing | Simpler than live browser integration; can add later |
| Profiles | Multi-profile support | User has work/personal/client contexts |
| Conversion | Two-way (park/unpark) | Full round-trip for context switching |
| Use cases | Context switching + organization | Swap workspaces, tame tab chaos |
| Language | TypeScript + Bun | Fast execution, good DX |
| CLI style | Subcommand-based | Scriptable, composable |

---

## Core Concepts

### Workflow

```
Tab Groups (live browser state) ←→ Bookmark Folders (persistent storage)
```

"Park" tab groups as bookmarks when switching contexts, "unpark" them later to restore.

### Safety Model

- `bgm` refuses to run if Brave is open (prevents corruption)
- All writes create backups first
- Dry-run mode available for testing

---

## Brave File Structure

### Profile Locations (Linux)

```
~/.config/BraveSoftware/Brave-Browser/
├── Default/              # First profile
├── Profile 1/            # Additional profiles
├── Profile 2/
└── Local State           # JSON - maps profile names to directories
```

### Key Files Per Profile

| File | Format | Contains |
|------|--------|----------|
| `Bookmarks` | JSON | All bookmarks and folders |
| `Current Session` | SNSS (binary) | Active tab groups and tabs |
| `Current Tabs` | SNSS (binary) | Tab state backup |

### Data Model

```typescript
interface TabGroup {
  id: string;
  name: string;
  color: string;  // grey, blue, red, yellow, green, pink, purple, cyan
  tabs: Tab[];
}

interface Tab {
  url: string;
  title: string;
}

interface BookmarkFolder {
  id: string;
  name: string;
  children: (BookmarkFolder | Bookmark)[];
}
```

---

## CLI Commands

### Profile Commands

```bash
bgm profiles                    # List all profiles
bgm profiles --current          # Show which profile bgm defaults to
bgm profiles use <name>         # Set default profile
```

### Tab Group Commands

```bash
bgm groups                      # List tab groups in default profile
bgm groups -p work              # List groups in 'work' profile
bgm groups show <name>          # Show tabs in a group
bgm groups delete <name>        # Remove a tab group
```

### Bookmark Commands

```bash
bgm bookmarks                   # List top-level bookmark folders
bgm bookmarks show <path>       # Show contents (e.g., "Projects/ClientX")
bgm bookmarks create <path>     # Create folder
bgm bookmarks delete <path>     # Delete folder/bookmark
```

### Conversion Commands (Key Feature)

```bash
# Park: Save tab group as bookmark folder
bgm park <group-name>                    # Creates folder in "Parked Groups/"
bgm park <group-name> --to <folder-path> # Custom destination

# Unpark: Restore bookmark folder as tab group
bgm unpark <folder-path>                 # Restore as tab group
bgm unpark <folder-path> --color blue    # With specific color
```

### Global Flags

```bash
--profile, -p <name>    # Override default profile
--dry-run               # Show what would happen
--backup                # Force backup before write (default: on)
```

---

## Technical Implementation

### Runtime & Tooling

```bash
bun init bgm                    # Bun for speed + TypeScript native
bun add commander               # CLI framework
bun add protobufjs              # For SNSS parsing
```

### Project Structure

```
bgm/
├── src/
│   ├── cli/
│   │   ├── index.ts           # Entry point, commander setup
│   │   ├── profiles.ts        # Profile commands
│   │   ├── groups.ts          # Tab group commands
│   │   ├── bookmarks.ts       # Bookmark commands
│   │   └── park.ts            # Park/unpark commands
│   ├── core/
│   │   ├── brave.ts           # Brave path detection, process check
│   │   ├── profiles.ts        # Profile discovery & config
│   │   ├── bookmarks.ts       # JSON read/write
│   │   ├── sessions.ts        # SNSS parsing (tab groups)
│   │   └── backup.ts          # Backup before write
│   └── types.ts               # Shared interfaces
├── package.json
└── tsconfig.json
```

### Key Implementation Details

1. **Brave detection** - Check `pgrep brave` before any write operation
2. **SNSS parsing** - Use `protobufjs` with Chromium's `.proto` definitions
3. **Backup strategy** - Copy files to `~/.local/share/bgm/backups/<timestamp>/`
4. **Config storage** - `~/.config/bgm/config.json` for default profile

---

## Implementation Phases

### Phase 1 - Foundation (MVP)

- [ ] Profile discovery and listing
- [ ] Bookmarks read/write (JSON)
- [ ] Basic CLI skeleton with commander
- [ ] Brave process detection

### Phase 2 - Tab Groups

- [ ] SNSS session file parsing
- [ ] Tab group listing and reading
- [ ] Tab group deletion

### Phase 3 - The Key Feature

- [ ] `bgm park` - Tab group → Bookmark folder
- [ ] `bgm unpark` - Bookmark folder → Tab group
- [ ] Backup system

### Phase 4 - Polish

- [ ] Dry-run mode
- [ ] Better error messages
- [ ] Config file for default profile
- [ ] Shell completions

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SNSS parsing complexity | Start with bookmarks-only; research Chromium session format |
| Brave format changes | Pin to known Brave versions; test against multiple versions |
| Data corruption | Always backup; refuse to run if Brave is open |

### Fallback for SNSS

If SNSS parsing proves too complex:
- Use Brave's `--dump-dom` or DevTools Protocol
- Or focus on bookmarks-only as Phase 1 deliverable
