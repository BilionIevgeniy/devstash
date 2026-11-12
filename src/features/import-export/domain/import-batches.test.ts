import { describe, expect, it } from "vitest";

import { toBatches } from "@/features/import-export/domain/import-batches";

// A record is its own size, so the limits are easy to read.
const sizeOf = (size: number) => size;

describe("toBatches", () => {
  it("cuts by count and keeps the order", () => {
    const { batches } = toBatches(
      [1, 1, 1, 1, 1],
      { maxRecords: 2, maxBytes: 100 },
      sizeOf,
    );
    expect(batches).toEqual([[1, 1], [1, 1], [1]]);
  });

  it("cuts before a record that would push a batch over the bytes", () => {
    const { batches } = toBatches(
      [40, 40, 30, 10],
      { maxRecords: 10, maxBytes: 100 },
      sizeOf,
    );
    expect(batches).toEqual([
      [40, 40],
      [30, 10],
    ]);
  });

  it("sets a record over the limit apart and sends the rest", () => {
    const result = toBatches(
      [10, 150, 20],
      { maxRecords: 10, maxBytes: 100 },
      sizeOf,
    );
    expect(result).toEqual({ batches: [[10, 20]], oversized: [150] });
  });

  it("makes no batch of nothing", () => {
    expect(
      toBatches([], { maxRecords: 2, maxBytes: 100 }, sizeOf).batches,
    ).toEqual([]);
  });
});
