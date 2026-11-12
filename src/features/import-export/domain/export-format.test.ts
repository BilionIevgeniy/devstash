import { describe, expect, it } from "vitest";

import {
  EXPORT_CLOSING,
  exportFileName,
  exportItemsChunk,
  exportOpening,
} from "@/features/import-export/domain/export-format";

const meta = {
  exportedAt: new Date("2026-11-12T10:30:00Z"),
  linksExpireAt: new Date("2026-11-12T12:00:00Z"),
};

// What the stream writes: the opening, then one chunk per page, then the end.
function file(collections: unknown[], pages: unknown[][]): string {
  let afterItems = false;
  let text = exportOpening(meta, collections);
  for (const page of pages) {
    text += exportItemsChunk(page, afterItems);
    afterItems ||= page.length > 0;
  }
  return text + EXPORT_CLOSING;
}

describe("export file", () => {
  it("is one JSON document with the version, the dates and both lists", () => {
    expect(JSON.parse(file([{ id: "c1" }], [[{ id: "i1" }]]))).toEqual({
      version: 1,
      exportedAt: "2026-11-12T10:30:00.000Z",
      linksExpireAt: "2026-11-12T12:00:00.000Z",
      collections: [{ id: "c1" }],
      items: [{ id: "i1" }],
    });
  });

  it("stays valid with no items, and with empty pages between full ones", () => {
    expect(JSON.parse(file([], [[]])).items).toEqual([]);
    const pages = [[{ id: "i1" }, { id: "i2" }], [], [{ id: "i3" }]];
    expect(JSON.parse(file([], pages)).items).toEqual([
      { id: "i1" },
      { id: "i2" },
      { id: "i3" },
    ]);
  });

  it("keeps text that looks like JSON inside a value", () => {
    const item = { id: "i1", content: '"]}, {"version": 2' };
    expect(JSON.parse(file([], [[item]])).items).toEqual([item]);
  });

  it("is named by the UTC date", () => {
    expect(exportFileName(new Date("2026-11-12T23:30:00-05:00"))).toBe(
      "devstash-export-2026-11-13.json",
    );
  });
});
