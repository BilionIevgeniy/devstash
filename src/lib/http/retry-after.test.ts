import { describe, expect, it } from "vitest";
import {
  getRetryAfterSeconds,
  tooManyAttemptsParams,
} from "@/lib/http/retry-after";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NOW = 1_700_000_000_000;

describe("getRetryAfterSeconds", () => {
  it("returns the whole seconds until the window ends", () => {
    expect(getRetryAfterSeconds(NOW + 30 * SECOND, NOW)).toBe(30);
  });

  it("rounds a partial second up", () => {
    expect(getRetryAfterSeconds(NOW + 1500, NOW)).toBe(2);
    expect(getRetryAfterSeconds(NOW + 1, NOW)).toBe(1);
  });

  it("never returns less than one second", () => {
    expect(getRetryAfterSeconds(NOW, NOW)).toBe(1);
    expect(getRetryAfterSeconds(NOW - 5 * SECOND, NOW)).toBe(1);
  });
});

// The words, singular and plural, are the message's: error-text.test.ts.
describe("tooManyAttemptsParams", () => {
  it("says 1 minute for anything up to a minute", () => {
    expect(tooManyAttemptsParams(NOW + 1 * SECOND, NOW)).toEqual({
      minutes: 1,
    });
    expect(tooManyAttemptsParams(NOW + MINUTE, NOW)).toEqual({ minutes: 1 });
  });

  it("says 1 minute for a window that has already ended", () => {
    expect(tooManyAttemptsParams(NOW - MINUTE, NOW)).toEqual({ minutes: 1 });
  });

  it("rounds up to whole minutes so the client never retries early", () => {
    expect(tooManyAttemptsParams(NOW + MINUTE + SECOND, NOW)).toEqual({
      minutes: 2,
    });
    expect(tooManyAttemptsParams(NOW + 15 * MINUTE, NOW)).toEqual({
      minutes: 15,
    });
  });
});

describe("getRetryAfterSeconds", () => {
  it("counts milliseconds up to whole seconds", () => {
    expect(getRetryAfterSeconds(60_000, 0)).toBe(60);
    expect(getRetryAfterSeconds(60_001, 0)).toBe(61);
  });
});
