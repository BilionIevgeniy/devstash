import { describe, expect, it } from "vitest";

import { DEFAULT_EDITOR_PREFERENCES } from "@/features/editor/_internal/domain/preferences";
import { editorPreferencesSchema } from "@/features/editor/schemas";

describe("editorPreferencesSchema", () => {
  it("accepts the default preferences", () => {
    const result = editorPreferencesSchema.safeParse(
      DEFAULT_EDITOR_PREFERENCES,
    );
    expect(result.success).toBe(true);
  });

  it.each([
    ["a font size not in the list", { fontSize: 15 }],
    ["a tab size not in the list", { tabSize: 3 }],
    ["an unknown theme", { theme: "solarized" }],
    ["a non-boolean toggle", { wordWrap: "on" }],
  ])("rejects %s", (_name, change) => {
    const result = editorPreferencesSchema.safeParse({
      ...DEFAULT_EDITOR_PREFERENCES,
      ...change,
    });
    expect(result.success).toBe(false);
  });
});
