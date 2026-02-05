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
