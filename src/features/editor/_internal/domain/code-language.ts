export const PLAIN_TEXT_LANGUAGE = "plaintext";

// Language ids of the code editor (Monaco) that items are likely to use.
const EDITOR_LANGUAGES = new Set([
  "typescript",
  "javascript",
  "python",
  "shell",
  "powershell",
  "yaml",
  "json",
  "sql",
  "markdown",
  "html",
  "css",
  "scss",
  "go",
  "rust",
  "java",
  "kotlin",
  "csharp",
  "cpp",
  "c",
  "ruby",
  "php",
  "swift",
  "dockerfile",
  "graphql",
  "xml",
]);

// What people type in the language field, mapped to the editor's id.
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  bash: "shell",
  sh: "shell",
  zsh: "shell",
  ps1: "powershell",
  yml: "yaml",
  md: "markdown",
  golang: "go",
  rs: "rust",
  kt: "kotlin",
  "c#": "csharp",
  cs: "csharp",
  "c++": "cpp",
  rb: "ruby",
  docker: "dockerfile",
  postgres: "sql",
  postgresql: "sql",
  mysql: "sql",
};

// "TS", " bash " and "typescript" all give an id the editor can highlight;
// a language it does not know is shown as plain text.
export function editorLanguage(language: string | null): string {
  const normalized = language?.trim().toLowerCase() ?? "";
  const id = LANGUAGE_ALIASES[normalized] ?? normalized;
  return EDITOR_LANGUAGES.has(id) ? id : PLAIN_TEXT_LANGUAGE;
}
