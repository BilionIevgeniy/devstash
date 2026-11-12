// The export file (ADR 0019):
// {"version":1,"exportedAt":…,"linksExpireAt":…,"collections":[…],"items":[…]}
// written in pieces, so the server holds one page of items at a time.

export const EXPORT_VERSION = 1;

export const EXPORT_CLOSING = "]}";

export interface ExportMeta {
  exportedAt: Date;
  /** When the download links of the file items stop working. */
  linksExpireAt: Date;
}

// devstash-export-2026-11-12.json, by the UTC date.
export function exportFileName(now: Date): string {
  return `devstash-export-${now.toISOString().slice(0, 10)}.json`;
}

// Everything before the first item: the version, the dates and every
// collection, then the opening bracket of the items.
export function exportOpening(
  { exportedAt, linksExpireAt }: ExportMeta,
  collections: readonly unknown[],
): string {
  const head = JSON.stringify({
    version: EXPORT_VERSION,
    exportedAt,
    linksExpireAt,
    collections,
  });
  return `${head.slice(0, -1)},"items":[`;
}

// One page of items. A page after items already written starts with a comma;
// an empty page writes nothing.
export function exportItemsChunk(
  items: readonly unknown[],
  afterItems: boolean,
): string {
  if (items.length === 0) return "";
  const body = items.map((item) => JSON.stringify(item)).join(",");
  return afterItems ? `,${body}` : body;
}
