import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  toEditorPreferences,
} from "@/features/editor/_internal/domain/preferences";

const STORED = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai",
};

describe("toEditorPreferences", () => {
  it("gives the defaults to a user with no row", () => {
    expect(toEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("keeps stored values that are still offered", () => {
    expect(toEditorPreferences(STORED)).toEqual(STORED);
  });

  it("resets only the field whose option is gone", () => {
    expect(toEditorPreferences({ ...STORED, theme: "solarized" })).toEqual({
      ...STORED,
      theme: DEFAULT_EDITOR_PREFERENCES.theme,
    });
    expect(toEditorPreferences({ ...STORED, fontSize: 15 })).toEqual({
      ...STORED,
      fontSize: DEFAULT_EDITOR_PREFERENCES.fontSize,
    });
  });
});
