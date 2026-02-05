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
