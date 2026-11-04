const SEARCH_PREVIEW_LENGTH = 120;

// The line under an item in the command palette: the copyable text on one
// line, cut by code point so an emoji is never split in half.
export function toSearchPreview(text: string | null): string | null {
  if (text === null) return null;

  const line = text.replace(/\s+/g, " ").trim();
  if (line === "") return null;

  return Array.from(line).slice(0, SEARCH_PREVIEW_LENGTH).join("").trimEnd();
}
