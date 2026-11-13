import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";

import { firstIssueMessage } from "@/lib/validation";

describe("firstIssueMessage", () => {
  it("is the message of the first issue, in the schema's words", () => {
    const schema = z.object({
      title: z.string().min(1, "Enter a title"),
      url: z.url("Enter a valid URL"),
    });
    const parsed = schema.safeParse({ title: "", url: "nope" });

    expect(parsed.success).toBe(false);
    expect(firstIssueMessage(parsed.error!)).toBe("Enter a title");
  });

  it("falls back when an error has no issue", () => {
    expect(firstIssueMessage(new ZodError([]))).toBe("Invalid input");
    expect(firstIssueMessage(new ZodError([]), "Invalid body")).toBe(
      "Invalid body",
    );
  });
});
