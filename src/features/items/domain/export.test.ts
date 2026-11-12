import { describe, expect, it } from "vitest";

import { exportLinksExpireAt } from "@/features/items/domain/export";

describe("exportLinksExpireAt", () => {
  it("is the end of the signing window the links share, at least an hour away", () => {
    const now = new Date("2026-11-12T10:30:00Z");
    expect(exportLinksExpireAt(now)).toEqual(new Date("2026-11-12T12:00:00Z"));
    expect(exportLinksExpireAt(new Date("2026-11-12T10:59:59Z"))).toEqual(
      new Date("2026-11-12T12:00:00Z"),
    );
  });
});
