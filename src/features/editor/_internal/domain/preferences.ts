export const FONT_SIZES: readonly number[] = [12, 13, 14, 16, 18, 20];
export const TAB_SIZES: readonly number[] = [2, 4, 8];
export const EDITOR_THEMES = ["vs-dark", "monokai", "github-dark"] as const;
export const SAVE_FAILED_MESSAGE =
  "Your preferences could not be saved. Please try again.";

export type EditorThemeName = (typeof EDITOR_THEMES)[number];

export interface EditorPreferences {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  theme: EditorThemeName;
}

interface StoredPreferences {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  theme: string;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
};

function oneOf<T>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.find((option) => option === value) ?? fallback;
}

// Each field falls back on its own, so an option removed from a list later
// resets that setting and not the other four.
export function toEditorPreferences(
  stored: StoredPreferences | null,
): EditorPreferences {
  if (!stored) return DEFAULT_EDITOR_PREFERENCES;

  const defaults = DEFAULT_EDITOR_PREFERENCES;
  return {
    fontSize: oneOf(FONT_SIZES, stored.fontSize, defaults.fontSize),
    tabSize: oneOf(TAB_SIZES, stored.tabSize, defaults.tabSize),
    wordWrap: stored.wordWrap,
    minimap: stored.minimap,
    theme: oneOf(EDITOR_THEMES, stored.theme, defaults.theme),
  };
}
