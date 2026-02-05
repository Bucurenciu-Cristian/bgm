import { describe, expect, test } from "bun:test";
import {
  createTabGroupCommands,
  serializeCommand,
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

    const serialized = serializeCommand(commands[0]!);

    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(3); // At least size(2) + id(1)
  });
});
