import type { EditorThemeName } from "@/features/editor/_internal/domain/preferences";

interface MonacoThemeData {
  base: "vs-dark";
  inherit: boolean;
  rules: { token: string; foreground: string }[];
  colors: Record<string, string>;
}

export const EDITOR_THEME_LABELS: Record<EditorThemeName, string> = {
  "vs-dark": "VS Dark",
  monokai: "Monokai",
  "github-dark": "GitHub Dark",
};

// The vs-dark option is Monaco's vs-dark with the app's colors, not the
// built-in theme, whose background does not match the frame around it.
export const MONACO_THEME_NAMES: Record<EditorThemeName, string> = {
  "vs-dark": "devstash-dark",
  monokai: "devstash-monokai",
  "github-dark": "devstash-github-dark",
};

const SCROLLBAR_COLORS = {
  "scrollbar.shadow": "#00000000",
  "scrollbarSlider.background": "#ffffff1a",
  "scrollbarSlider.hoverBackground": "#ffffff33",
  "scrollbarSlider.activeBackground": "#ffffff4d",
};

// Monaco takes hex colors, not CSS variables: these follow the dark tokens in
// globals.css (--card, --muted, --muted-foreground, --border).
const DEVSTASH_DARK: MonacoThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#171717",
    "editor.lineHighlightBackground": "#262626",
    "editor.lineHighlightBorder": "#00000000",
    "editorLineNumber.foreground": "#525252",
    "editorLineNumber.activeForeground": "#a3a3a3",
    "editorGutter.background": "#171717",
    ...SCROLLBAR_COLORS,
  },
};

const MONOKAI: MonacoThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "75715e" },
    { token: "string", foreground: "e6db74" },
    { token: "number", foreground: "ae81ff" },
    { token: "constant", foreground: "ae81ff" },
    { token: "keyword", foreground: "f92672" },
    { token: "type", foreground: "66d9ef" },
    { token: "function", foreground: "a6e22e" },
    { token: "tag", foreground: "f92672" },
    { token: "attribute.name", foreground: "a6e22e" },
    { token: "attribute.value", foreground: "e6db74" },
  ],
  colors: {
    "editor.background": "#272822",
    "editor.foreground": "#f8f8f2",
    "editor.lineHighlightBackground": "#3e3d32",
    "editor.lineHighlightBorder": "#00000000",
    "editor.selectionBackground": "#49483e",
    "editorCursor.foreground": "#f8f8f0",
    "editorLineNumber.foreground": "#90908a",
    "editorLineNumber.activeForeground": "#f8f8f2",
    "editorGutter.background": "#272822",
    ...SCROLLBAR_COLORS,
  },
};

const GITHUB_DARK: MonacoThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8b949e" },
    { token: "string", foreground: "a5d6ff" },
    { token: "number", foreground: "79c0ff" },
    { token: "constant", foreground: "79c0ff" },
    { token: "keyword", foreground: "ff7b72" },
    { token: "type", foreground: "ffa657" },
    { token: "function", foreground: "d2a8ff" },
    { token: "tag", foreground: "7ee787" },
    { token: "attribute.name", foreground: "79c0ff" },
    { token: "attribute.value", foreground: "a5d6ff" },
  ],
  colors: {
    "editor.background": "#0d1117",
    "editor.foreground": "#e6edf3",
    "editor.lineHighlightBackground": "#161b22",
    "editor.lineHighlightBorder": "#00000000",
    "editor.selectionBackground": "#264f78",
    "editorCursor.foreground": "#e6edf3",
    "editorLineNumber.foreground": "#6e7681",
    "editorLineNumber.activeForeground": "#e6edf3",
    "editorGutter.background": "#0d1117",
    ...SCROLLBAR_COLORS,
  },
};

export const MONACO_THEMES: Record<EditorThemeName, MonacoThemeData> = {
  "vs-dark": DEVSTASH_DARK,
  monokai: MONOKAI,
  "github-dark": GITHUB_DARK,
};
