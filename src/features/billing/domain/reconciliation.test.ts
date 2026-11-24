import { describe, expect, it } from "vitest";

import {
  rotateForDay,
  rowsDeadline,
} from "@/features/billing/domain/reconciliation";

const DAY_MS = 24 * 60 * 60 * 1000;
const rows = (count: number) => Array.from({ length: count }, (_, i) => i);
const on = (day: number) => new Date(day * DAY_MS + 3 * 60 * 60 * 1000);

// How many daily runs it takes until each row was among the first `capacity`.
function runsToReachAll(count: number, capacity: number, firstDay: number) {
  const seen = new Set<number>();
  let runs = 0;
  while (seen.size < count) {
    rotateForDay(rows(count), on(firstDay + runs))
      .slice(0, capacity)
      .forEach((row) => seen.add(row));
    runs += 1;
    if (runs > 10_000) throw new Error("Some rows are never reached");
  }
  return runs;
}

describe("rotateForDay", () => {
  it.each([0, 1, 2, 7])("keeps every one of %i rows once", (count) => {
    const rotated = rotateForDay(rows(count), on(20_781));

    expect(rotated.toSorted((a, b) => a - b)).toEqual(rows(count));
  });

  it("goes round: the rows before the start come last, in their order", () => {
    const rotated = rotateForDay(rows(100), on(20_781));
    const start = rotated[0];

    expect(rotated).toEqual([
      ...rows(100).slice(start),
      ...rows(100).slice(0, start),
    ]);
  });

  it("starts at the same place all day, and elsewhere the next", () => {
    const early = new Date(20_781 * DAY_MS);
    const late = new Date(20_782 * DAY_MS - 1);

    expect(rotateForDay(rows(100), early)).toEqual(
      rotateForDay(rows(100), late),
    );
    expect(rotateForDay(rows(100), on(20_782))[0]).not.toBe(
      rotateForDay(rows(100), on(20_781))[0],
    );
  });

  // The bound: a run that gets through a quarter of the rows has reached all
  // of them within a week, whatever their number and whenever it starts.
  it.each([4, 100, 1_001, 20_000])(
    "reaches all of %i rows within 7 runs of a quarter each",
    (count) => {
      for (const firstDay of [0, 19_000, 20_781, 20_999]) {
        expect(
          runsToReachAll(count, Math.ceil(count / 4), firstDay),
        ).toBeLessThanOrEqual(7);
      }
    },
  );

  it.each([10, 50, 200])(
    "reaches all rows within 3 rounds when a run gets through 1 in %i",
    (share) => {
      expect(runsToReachAll(2_000, 2_000 / share, 20_781)).toBeLessThanOrEqual(
        3 * share,
      );
    },
  );
});

describe("rowsDeadline", () => {
  it("leaves the second pass a share of the time that is left", () => {
    expect(rowsDeadline(1_000, 11_000)).toBe(8_000);
  });

  it("is over at once when no time is left", () => {
    expect(rowsDeadline(11_000, 1_000)).toBe(1_000);
  });
});
