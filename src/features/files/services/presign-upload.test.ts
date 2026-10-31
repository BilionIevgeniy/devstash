import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEntitlements, signPutUrl, consumeRateLimit } = vi.hoisted(() => ({
  getEntitlements: vi.fn(),
  signPutUrl: vi.fn(),
  consumeRateLimit: vi.fn(),
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/lib/r2", () => ({ signPutUrl }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));

import {
  presignUpload,
  PRO_ONLY_MESSAGE,
} from "@/features/files/services/presign-upload";

const input = { kind: "file" as const, fileName: "Notes.MD", size: 2048 };

describe("presignUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEntitlements.mockResolvedValue({ isPro: true });
    signPutUrl.mockResolvedValue("https://r2.example/signed");
    consumeRateLimit.mockResolvedValue({
      success: true,
      remaining: 29,
      reset: Date.now(),
    });
  });

  it("refuses a user over the upload quota without signing", async () => {
    consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 10 * 60 * 1000,
    });

    const result = await presignUpload("user-1", input);

    expect(consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "presign:user" }),
      "user-1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^Too many attempts/);
    expect(signPutUrl).not.toHaveBeenCalled();
  });

  it("does not count a file the rules reject", async () => {
    await presignUpload("user-1", { ...input, fileName: "a.exe" });

    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("refuses a Free user without signing anything", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    const result = await presignUpload("user-1", input);

    expect(result).toEqual({
      success: false,
      error: PRO_ONLY_MESSAGE,
      data: null,
    });
    expect(signPutUrl).not.toHaveBeenCalled();
  });

  it("refuses a file the rules reject", async () => {
    const result = await presignUpload("user-1", {
      ...input,
      fileName: "a.exe",
    });

    expect(result.success).toBe(false);
    expect(signPutUrl).not.toHaveBeenCalled();
  });

  it("signs a key under the user's prefix with the type of the extension", async () => {
    const result = await presignUpload("user-1", input);

    expect(result.success).toBe(true);
    expect(result.data?.key).toMatch(/^users\/user-1\/[0-9a-f-]{36}\.md$/);
    expect(result.data?.contentType).toBe("text/markdown");
    expect(signPutUrl).toHaveBeenCalledWith(
      result.data?.key,
      "text/markdown",
      expect.any(Number),
    );
  });
});
