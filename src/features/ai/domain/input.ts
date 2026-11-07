// The hard ceiling of what an AI action accepts, the same as an item's content
// (items' CONTENT_MAX, which this feature cannot import): a long item is
// truncated before the call, not refused.
export const AI_INPUT_MAX = 100_000;

// What one click may send. Tags need only the start of an item.
export const AUTO_TAG_TITLE_MAX = 200;
export const AUTO_TAG_CONTENT_MAX = 2_000;
// A summary reads more of the item, so it describes the whole and not the start.
export const SUMMARY_TITLE_MAX = 200;
export const SUMMARY_CONTENT_MAX = 8_000;

// An explanation reads the code, and says in the UI when it was cut.
export const EXPLAIN_TITLE_MAX = 200;
export const EXPLAIN_CODE_MAX = 8_000;

// The item as every operation sends it: fixed instructions first and the item
// last, so the prefix stays the same across calls. The item is data to
// describe: text inside it that reads like an order is still only content.
export function itemInput(title: string, content: string): string {
  return `<item>\nTitle: ${title}\n\nContent:\n${content}\n</item>`;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

// Cuts to at most `max` UTF-16 units, without splitting an emoji or another
// character outside the basic plane in half.
export function truncateForModel(text: string, max: number): string {
  if (text.length <= max) return text;
  const end = isHighSurrogate(text.charCodeAt(max - 1)) ? max - 1 : max;
  return text.slice(0, end);
}

// Whether truncateForModel would cut the text, so the UI can say so.
export function isCutForModel(text: string, max: number): boolean {
  return truncateForModel(text, max).length < text.length;
}
