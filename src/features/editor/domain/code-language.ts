export const PLAIN_TEXT_LANGUAGE = "plaintext";

export interface EditorLanguage {
  /** The code editor's (Monaco) language id, which an item stores. */
  id: string;
  label: string;
  /** What people type in the language field for it. */
  aliases: readonly string[];
}

// The languages the code editor highlights that items are likely to use,
// Plain text first: the list the language picker offers, in its order.
export const EDITOR_LANGUAGES: readonly EditorLanguage[] = [
  { id: PLAIN_TEXT_LANGUAGE, label: "Plain text", aliases: ["text", "txt"] },
  { id: "typescript", label: "TypeScript", aliases: ["ts", "tsx"] },
  { id: "javascript", label: "JavaScript", aliases: ["js", "jsx"] },
  { id: "python", label: "Python", aliases: ["py"] },
  { id: "shell", label: "Shell", aliases: ["bash", "sh", "zsh"] },
  { id: "powershell", label: "PowerShell", aliases: ["ps1"] },
  { id: "yaml", label: "YAML", aliases: ["yml"] },
  { id: "json", label: "JSON", aliases: [] },
  {
    id: "sql",
    label: "SQL",
    aliases: ["postgres", "postgresql", "mysql"],
  },
  { id: "markdown", label: "Markdown", aliases: ["md"] },
  { id: "html", label: "HTML", aliases: [] },
  { id: "css", label: "CSS", aliases: [] },
  { id: "scss", label: "SCSS", aliases: [] },
  { id: "go", label: "Go", aliases: ["golang"] },
  { id: "rust", label: "Rust", aliases: ["rs"] },
  { id: "java", label: "Java", aliases: [] },
  { id: "kotlin", label: "Kotlin", aliases: ["kt"] },
  { id: "csharp", label: "C#", aliases: ["c#", "cs"] },
  { id: "cpp", label: "C++", aliases: ["c++"] },
  { id: "c", label: "C", aliases: [] },
  { id: "ruby", label: "Ruby", aliases: ["rb"] },
  { id: "php", label: "PHP", aliases: [] },
  { id: "swift", label: "Swift", aliases: [] },
  { id: "dockerfile", label: "Dockerfile", aliases: ["docker"] },
  { id: "graphql", label: "GraphQL", aliases: [] },
  { id: "xml", label: "XML", aliases: [] },
];

// Every id and alias, lowercase, to its language.
const LANGUAGE_LOOKUP = new Map<string, EditorLanguage>(
  EDITOR_LANGUAGES.flatMap((language) =>
    [language.id, ...language.aliases].map((name) => [name, language] as const),
  ),
);

function findLanguage(trimmed: string): EditorLanguage | undefined {
  return LANGUAGE_LOOKUP.get(trimmed.toLowerCase());
}

// "TS", " bash " and "typescript" all give an id the editor can highlight;
// a language it does not know is shown as plain text.
export function editorLanguage(language: string | null): string {
  return findLanguage(language?.trim() ?? "")?.id ?? PLAIN_TEXT_LANGUAGE;
}

// The option of the picker that a stored value stands for: Plain text when
// it is empty, null for free text no option matches, so nothing is checked
// and the value is not taken for one it is not.
export function languageOption(language: string | null): string | null {
  const trimmed = language?.trim() ?? "";
  if (trimmed === "") return PLAIN_TEXT_LANGUAGE;
  return findLanguage(trimmed)?.id ?? null;
}

// What the editor header, the drawer and the picker show: the language's
// name, or free text no option matches as it was typed.
export function languageLabel(language: string | null): string {
  const trimmed = language?.trim() ?? "";
  if (trimmed === "") return "Plain text";
  return findLanguage(trimmed)?.label ?? trimmed;
}
