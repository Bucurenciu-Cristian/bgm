/**
 * Manual SNSS parser - more resilient than Kaitai-generated parser
 * Handles unknown command types and truncated data gracefully
 */

export interface ParsedCommand {
  id: number;
  size: number;
  body: Uint8Array;
  parsed?: Record<string, unknown>;
}

export interface ParsedSession {
  version: number;
  commands: ParsedCommand[];
}

/**
 * Read a little-endian uint16 from a DataView
 */
function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

/**
 * Read a little-endian uint32 from a DataView
 */
function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

/**
 * Read a little-endian uint64 as BigInt from a DataView
 */
function readU64(view: DataView, offset: number): bigint {
  const low = BigInt(view.getUint32(offset, true));
  const high = BigInt(view.getUint32(offset + 4, true));
  return (high << 32n) | low;
}

/**
 * Read a Chrome string16 (length-prefixed UTF-16LE)
 */
function readString16(view: DataView, offset: number): { value: string; bytesRead: number } {
  const length = readU32(view, offset);
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset + 4, length * 2);
  // @ts-ignore - utf-16le is a valid encoding
  const decoder = new TextDecoder("utf-16le");
  return {
    value: decoder.decode(bytes),
    bytesRead: 4 + length * 2,
  };
}

/**
 * Read a length-prefixed UTF-8/ASCII string (with 4-byte alignment)
 */
function readString8(view: DataView, offset: number): { value: string; bytesRead: number } {
  const length = readU32(view, offset);
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset + 4, length);
  const decoder = new TextDecoder("utf-8");
  // Align to 4 bytes (Chromium pickle format)
  const totalBytes = 4 + length;
  const alignedBytes = Math.ceil((offset + totalBytes) / 4) * 4 - offset;
  return {
    value: decoder.decode(bytes),
    bytesRead: alignedBytes,
  };
}

// Command type constants
const CMD_SET_TAB_WINDOW = 0;
const CMD_SET_TAB_INDEX_IN_WINDOW = 2;
const CMD_UPDATE_TAB_NAVIGATION = 6;
const CMD_SET_SELECTED_NAVIGATION_INDEX = 7;
const CMD_SET_SELECTED_TAB_IN_INDEX = 8;
const CMD_SET_WINDOW_TYPE = 9;
const CMD_SET_PINNED_STATE = 12;
const CMD_SET_WINDOW_BOUNDS3 = 14;
const CMD_TAB_CLOSED = 16;
const CMD_WINDOW_CLOSED = 17;
const CMD_SET_ACTIVE_WINDOW = 20;
const CMD_SET_TAB_GROUP = 25;
const CMD_SET_TAB_GROUP_METADATA = 26;
const CMD_SET_TAB_GROUP_METADATA2 = 27;

/**
 * Parse command body based on command type
 */
function parseCommandBody(id: number, body: Uint8Array): Record<string, unknown> | undefined {
  if (body.length < 4) return undefined;

  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const pickleSize = readU32(view, 0);

  try {
    switch (id) {
      case CMD_SET_TAB_WINDOW: {
        if (body.length < 12) return undefined;
        return {
          tabId: readU32(view, 4),
          windowId: readU32(view, 8),
        };
      }

      case CMD_SET_TAB_INDEX_IN_WINDOW: {
        if (body.length < 12) return undefined;
        return {
          tabId: readU32(view, 4),
          index: readU32(view, 8),
        };
      }

      case CMD_SET_TAB_GROUP: {
        if (body.length < 24) return undefined;
        // Format: tab_id(4) + padding(4) + token_high(8) + token_low(8)
        return {
          tabId: readU32(view, 0),
          tokenHigh: readU64(view, 8),
          tokenLow: readU64(view, 16),
        };
      }

      case CMD_SET_TAB_GROUP_METADATA:
      case CMD_SET_TAB_GROUP_METADATA2: {
        if (body.length < 24) return undefined;
        const tokenHigh = readU64(view, 4);
        const tokenLow = readU64(view, 12);

        // Try to read title
        let offset = 20;
        if (offset + 4 > body.length) {
          return { tokenHigh, tokenLow, title: "", color: 0 };
        }

        const titleResult = readString16(view, offset);
        offset += titleResult.bytesRead;

        // Try to read color
        let color = 0;
        if (offset + 4 <= body.length) {
          color = readU32(view, offset);
        }

        return {
          tokenHigh,
          tokenLow,
          title: titleResult.value,
          color,
        };
      }

      case CMD_UPDATE_TAB_NAVIGATION: {
        if (body.length < 12) return undefined;
        const tabId = readU32(view, 4);
        const navigationIndex = readU32(view, 8);

        let offset = 12;

        // Try to read URL (ASCII/UTF-8, NOT UTF-16)
        if (offset + 4 > body.length) {
          return { tabId, navigationIndex, url: "", title: "" };
        }
        const urlResult = readString8(view, offset);
        offset += urlResult.bytesRead;

        // Try to read title (UTF-16LE)
        if (offset + 4 > body.length) {
          return { tabId, navigationIndex, url: urlResult.value, title: "" };
        }
        const titleResult = readString16(view, offset);

        return {
          tabId,
          navigationIndex,
          url: urlResult.value,
          title: titleResult.value,
        };
      }

      case CMD_SET_SELECTED_NAVIGATION_INDEX: {
        if (body.length < 12) return undefined;
        return {
          tabId: readU32(view, 4),
          index: readU32(view, 8),
        };
      }

      case CMD_SET_SELECTED_TAB_IN_INDEX: {
        if (body.length < 12) return undefined;
        return {
          windowId: readU32(view, 4),
          index: readU32(view, 8),
        };
      }

      case CMD_SET_WINDOW_TYPE: {
        if (body.length < 12) return undefined;
        return {
          windowId: readU32(view, 4),
          windowType: readU32(view, 8),
        };
      }

      case CMD_SET_PINNED_STATE: {
        if (body.length < 9) return undefined;
        return {
          tabId: readU32(view, 4),
          isPinned: body[8] !== 0,
        };
      }

      case CMD_SET_WINDOW_BOUNDS3: {
        if (body.length < 28) return undefined;
        return {
          windowId: readU32(view, 4),
          x: view.getInt32(8, true),
          y: view.getInt32(12, true),
          width: view.getInt32(16, true),
          height: view.getInt32(20, true),
          showState: readU32(view, 24),
        };
      }

      case CMD_TAB_CLOSED: {
        if (body.length < 16) return undefined;
        return {
          tabId: readU32(view, 4),
          closeTime: readU64(view, 8),
        };
      }

      case CMD_WINDOW_CLOSED: {
        if (body.length < 16) return undefined;
        return {
          windowId: readU32(view, 4),
          closeTime: readU64(view, 8),
        };
      }

      case CMD_SET_ACTIVE_WINDOW: {
        if (body.length < 8) return undefined;
        return {
          windowId: readU32(view, 4),
        };
      }

      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

/**
 * Parse an SNSS session file
 */
export async function parseSessionFile(path: string): Promise<ParsedSession> {
  const file = Bun.file(path);
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Check magic bytes "SNSS"
  if (
    data[0] !== 0x53 || // S
    data[1] !== 0x4e || // N
    data[2] !== 0x53 || // S
    data[3] !== 0x53    // S
  ) {
    throw new Error(`Invalid SNSS magic bytes in ${path}`);
  }

  const version = readU32(view, 4);
  const commands: ParsedCommand[] = [];

  let offset = 8; // After magic and version

  while (offset + 3 <= data.length) {
    const size = readU16(view, offset);
    const id = data[offset + 2]!;

    if (size < 1 || offset + 2 + size > data.length) {
      // Invalid size or truncated - stop parsing
      break;
    }

    const body = data.slice(offset + 3, offset + 2 + size);
    const parsed = parseCommandBody(id, body);

    commands.push({
      id,
      size,
      body,
      parsed,
    });

    offset += 2 + size;
  }

  return { version, commands };
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

// Export command type constants for external use
export const CommandType = {
  SET_TAB_WINDOW: CMD_SET_TAB_WINDOW,
  SET_TAB_INDEX_IN_WINDOW: CMD_SET_TAB_INDEX_IN_WINDOW,
  UPDATE_TAB_NAVIGATION: CMD_UPDATE_TAB_NAVIGATION,
  SET_SELECTED_NAVIGATION_INDEX: CMD_SET_SELECTED_NAVIGATION_INDEX,
  SET_SELECTED_TAB_IN_INDEX: CMD_SET_SELECTED_TAB_IN_INDEX,
  SET_WINDOW_TYPE: CMD_SET_WINDOW_TYPE,
  SET_PINNED_STATE: CMD_SET_PINNED_STATE,
  SET_WINDOW_BOUNDS3: CMD_SET_WINDOW_BOUNDS3,
  TAB_CLOSED: CMD_TAB_CLOSED,
  WINDOW_CLOSED: CMD_WINDOW_CLOSED,
  SET_ACTIVE_WINDOW: CMD_SET_ACTIVE_WINDOW,
  SET_TAB_GROUP: CMD_SET_TAB_GROUP,
  SET_TAB_GROUP_METADATA: CMD_SET_TAB_GROUP_METADATA,
  SET_TAB_GROUP_METADATA2: CMD_SET_TAB_GROUP_METADATA2,
} as const;
