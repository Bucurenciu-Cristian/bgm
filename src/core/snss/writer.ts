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
    const tab = tabs[i]!;
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
