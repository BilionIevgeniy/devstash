import { describe, expect, it } from "vitest";

import {
  AI_BY_APP_DAY,
  AI_BY_USER_DAY,
  AI_BY_USER_HOUR,
} from "@/features/ai/domain/rate-limits";

// The windows are products of seconds: a slip would lift the cap on the bill,
// and no other test would see it.
describe("the AI limits", () => {
  it("last an hour and a day", () => {
    expect(AI_BY_USER_HOUR.windowSeconds).toBe(3_600);
    expect(AI_BY_USER_DAY.windowSeconds).toBe(86_400);
    expect(AI_BY_APP_DAY.windowSeconds).toBe(86_400);
  });

  it("cap a user's day below the hourly rate", () => {
    expect(AI_BY_USER_DAY.limit).toBeLessThan(AI_BY_USER_HOUR.limit * 24);
  });
});
