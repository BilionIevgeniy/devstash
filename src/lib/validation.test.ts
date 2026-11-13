import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";

import { firstIssue } from "@/lib/validation";

describe("firstIssue", () => {
  it("is the code of the first issue, as the schema gives it", () => {
    const schema = z.object({
      title: z.string().min(1, "titleRequired"),
      url: z.url("invalidUrl"),
    });
    const parsed = schema.safeParse({ title: "x", url: "nope" });

    expect(parsed.success).toBe(false);
    expect(firstIssue(parsed.error!)).toEqual({
      success: false,
      data: null,
      error: "invalidUrl",
    });
  });

  it("carries the bound of a length check only for a message that has {max} or {min}", () => {
    const tooLong = z.string().max(3, "titleTooLong").safeParse("abcd");
    const tooShort = z.string().min(8, "passwordTooShort").safeParse("abc");
    const bigint = z
      .bigint()
      .max(BigInt(5), "titleTooLong")
      .safeParse(BigInt(6));
    const noNumber = z.string().min(1, "titleRequired").safeParse("");

    expect(firstIssue(tooLong.error!).params).toEqual({ max: 3 });
    expect(firstIssue(tooShort.error!).params).toEqual({ min: 8 });
    expect(firstIssue(bigint.error!).params).toEqual({ max: 5 });
    expect(firstIssue(noNumber.error!)).not.toHaveProperty("params");
  });

  it("falls back for a message that is not a code, such as a Zod default", () => {
    const parsed = z.string().safeParse(42);

    expect(firstIssue(parsed.error!).error).toBe("invalidInput");
    expect(firstIssue(parsed.error!, "invalidRequest").error).toBe(
      "invalidRequest",
    );
  });

  it("falls back when an error has no issue", () => {
    expect(firstIssue(new ZodError([])).error).toBe("invalidInput");
  });
});
