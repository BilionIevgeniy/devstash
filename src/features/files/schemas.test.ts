import { describe, expect, it } from "vitest";

import { requestUploadSchema } from "@/features/files/schemas";

const valid = { kind: "image", fileName: "cat.png", size: 2048 };

function parse(input: Record<string, unknown>) {
  return requestUploadSchema.safeParse({ ...valid, ...input });
}

describe("requestUploadSchema", () => {
  it("accepts a declared file and trims its name", () => {
    expect(parse({ fileName: "  cat.png  " }).data).toEqual(valid);
  });

  it("rejects an empty or blank name", () => {
    expect(parse({ fileName: "" }).success).toBe(false);
    expect(parse({ fileName: "   " }).success).toBe(false);
  });

  it("rejects a name over 255 characters", () => {
    expect(parse({ fileName: `${"a".repeat(252)}.png` }).success).toBe(false);
    expect(parse({ fileName: `${"a".repeat(251)}.png` }).success).toBe(true);
  });

  it("needs a whole, positive size", () => {
    expect(parse({ size: 0 }).success).toBe(false);
    expect(parse({ size: -1 }).success).toBe(false);
    expect(parse({ size: 1.5 }).success).toBe(false);
  });

  it("knows only the image and file kinds", () => {
    expect(parse({ kind: "file" }).success).toBe(true);
    expect(parse({ kind: "video" }).success).toBe(false);
  });
});
