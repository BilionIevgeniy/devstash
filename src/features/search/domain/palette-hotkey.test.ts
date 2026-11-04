import { describe, expect, it } from "vitest";

import {
  isPaletteHotkey,
  type HotkeyEvent,
} from "@/features/search/domain/palette-hotkey";

function press(fields: Partial<HotkeyEvent>): HotkeyEvent {
  return {
    key: "k",
    code: "KeyK",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...fields,
  };
}

describe("isPaletteHotkey", () => {
  it("accepts Cmd+K and Ctrl+K", () => {
    expect(isPaletteHotkey(press({ metaKey: true }))).toBe(true);
    expect(isPaletteHotkey(press({ ctrlKey: true }))).toBe(true);
  });

  it("accepts K with Caps Lock on", () => {
    expect(isPaletteHotkey(press({ metaKey: true, key: "K" }))).toBe(true);
  });

  it("ignores K with no modifier, so typing is left alone", () => {
    expect(isPaletteHotkey(press({}))).toBe(false);
  });

  it("ignores Alt and Shift combinations, which belong to other shortcuts", () => {
    expect(isPaletteHotkey(press({ metaKey: true, altKey: true }))).toBe(false);
    expect(isPaletteHotkey(press({ metaKey: true, shiftKey: true }))).toBe(
      false,
    );
  });

  it("works on a Cyrillic layout, by the physical key", () => {
    expect(isPaletteHotkey(press({ metaKey: true, key: "л" }))).toBe(true);
  });

  it("follows the letter on Dvorak, where K sits on another key", () => {
    expect(
      isPaletteHotkey(press({ metaKey: true, key: "k", code: "KeyV" })),
    ).toBe(true);
  });

  it("leaves Cmd+T alone on Dvorak, where T sits on the physical K", () => {
    expect(
      isPaletteHotkey(press({ metaKey: true, key: "t", code: "KeyK" })),
    ).toBe(false);
  });
});
