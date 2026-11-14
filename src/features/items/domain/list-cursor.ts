// The cursor of an endless list (ADR 0025): the values of the sort keys of the
// last row of a page, then its id. A keyset on values, not a row to look up,
// so a page still continues right after a row that was unstarred or deleted
// since. The sort is part of the cursor, so one made for A-Z is refused for
// Newest instead of reaching the database as a title where a date belongs.

/** What each value of a cursor is: an ISO date or a plain text. */
export type CursorKind = "date" | "text";

interface CursorBody {
  s: string;
  v: string[];
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isKind(value: unknown, kind: CursorKind): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  return (
    kind === "text" ||
    (ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)))
  );
}

function isBody(value: unknown): value is CursorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "s" in value &&
    typeof value.s === "string" &&
    "v" in value &&
    Array.isArray(value.v)
  );
}

export function encodeListCursor(sort: string, values: string[]): string {
  const body: CursorBody = { s: sort, v: values };
  return toBase64Url(JSON.stringify(body));
}

/**
 * The values of a cursor made for `sort`, each of the kind `kinds` names, or
 * null for anything else: a malformed text, another sort, a wrong length.
 */
export function decodeListCursor(
  text: string,
  sort: string,
  kinds: readonly CursorKind[],
): string[] | null {
  const json = fromBase64Url(text);
  if (json === null) return null;
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isBody(body) || body.s !== sort || body.v.length !== kinds.length) {
    return null;
  }
  const values: unknown[] = body.v;
  return values.every((value, index) => isKind(value, kinds[index]))
    ? (values as string[])
    : null;
}
