// The hard ceiling of what an AI action accepts, the same as an item's content
// (items' CONTENT_MAX, which this feature cannot import): a long item is
// truncated before the call, not refused.
export const AI_INPUT_MAX = 100_000;

// What one click may send. Tags need only the start of an item.
export const AUTO_TAG_TITLE_MAX = 200;
export const AUTO_TAG_CONTENT_MAX = 2_000;

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
