import { describe, expect, it } from "vitest";

import { toBatches } from "@/features/import-export/domain/import-batches";
import {
  IMPORT_BATCH_MAX_BYTES,
  IMPORT_BATCH_MAX_RECORDS,
  IMPORT_BY_USER,
  IMPORT_FILE_MAX_BYTES,
  IMPORT_MAX_COLLECTIONS,
  IMPORT_MAX_ITEMS,
} from "@/features/import-export/domain/limits";

const LIMITS = {
  maxRecords: IMPORT_BATCH_MAX_RECORDS,
  maxBytes: IMPORT_BATCH_MAX_BYTES,
};

// A rerun of the largest file sends every batch again, duplicates included;
// the window must take them all, or the run stops at the same batch each time.
describe("IMPORT_BY_USER", () => {
  it("takes every batch of the largest file in one window", () => {
    // Records sized so the byte cut adds as many batches as the file allows.
    const share = (count: number) =>
      Math.floor(IMPORT_FILE_MAX_BYTES / 2 / count);
    const items = toBatches(
      Array(IMPORT_MAX_ITEMS).fill(share(IMPORT_MAX_ITEMS)),
      LIMITS,
      (size) => size,
    );
    const collections = toBatches(
      Array(IMPORT_MAX_COLLECTIONS).fill(share(IMPORT_MAX_COLLECTIONS)),
      LIMITS,
      (size) => size,
    );

    const batches = items.batches.length + collections.batches.length;
    expect(IMPORT_BY_USER.limit).toBeGreaterThanOrEqual(batches);
  });
});
