import type { Profile, TabGroup, Tab, TabGroupColor } from "../types";
import { getLatestSessionFile } from "./sessions";
import { parseSessionFile, CommandType } from "./snss/parser";

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

  // Collect tab indices (command 2)
  const tabIndices = new Map<number, number>();

  for (const cmd of session.commands) {
    const body = cmd.parsed;
    if (!body) continue;

    switch (cmd.id) {
      case CommandType.SET_TAB_INDEX_IN_WINDOW: {
        const tabId = body.tabId as number | undefined;
        const index = body.index as number | undefined;
        if (tabId !== undefined && index !== undefined) {
          tabIndices.set(tabId, index);
        }
        break;
      }

      case CommandType.UPDATE_TAB_NAVIGATION: {
        const tabId = body.tabId as number | undefined;
        if (tabId !== undefined) {
          tabNavigations.set(tabId, {
            tabId,
            url: (body.url as string) || "",
            title: (body.title as string) || "",
            index: (body.navigationIndex as number) || 0,
          });
        }
        break;
      }

      case CommandType.SET_TAB_GROUP: {
        const tabId = body.tabId as number | undefined;
        const tokenHigh = body.tokenHigh as bigint | undefined;
        const tokenLow = body.tokenLow as bigint | undefined;
        if (tabId !== undefined && tokenHigh !== undefined && tokenLow !== undefined) {
          tabAssignments.push({ tabId, tokenHigh, tokenLow });
        }
        break;
      }

      case CommandType.SET_TAB_GROUP_METADATA:
      case CommandType.SET_TAB_GROUP_METADATA2: {
        const tokenHigh = body.tokenHigh as bigint | undefined;
        const tokenLow = body.tokenLow as bigint | undefined;
        if (tokenHigh !== undefined && tokenLow !== undefined) {
          const token = makeToken(tokenHigh, tokenLow);
          groupMetadata.set(token, {
            tokenHigh,
            tokenLow,
            name: (body.title as string) || "Unnamed Group",
            color: COLOR_MAP[body.color as number] || "grey",
          });
        }
        break;
      }
    }
  }

  // Build groups from metadata
  const groups: TabGroup[] = [];

  for (const [token, metadata] of groupMetadata) {
    // Find tabs assigned to this group
    const assignedTabs = tabAssignments.filter(
      (a) => makeToken(a.tokenHigh, a.tokenLow) === token
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
