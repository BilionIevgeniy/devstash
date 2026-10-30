import { beforeEach, describe, expect, it, vi } from "vitest";

const { headObject, deleteObject, deletePrefix, signGetUrl } = vi.hoisted(
  () => ({
    headObject: vi.fn(),
    deleteObject: vi.fn(),
    deletePrefix: vi.fn(),
    signGetUrl: vi.fn(),
  }),
);
vi.mock("@/lib/r2", () => ({
  headObject,
  deleteObject,
  deletePrefix,
  signGetUrl,
}));

import {
  confirmUpload,
  deleteUserObject,
  purgeUserObjects,
  signFileUrls,
} from "@/features/files/services/objects";

const MB = 1024 * 1024;
const imageKey = "users/user-1/abc.png";

describe("confirmUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the real size of a valid object", async () => {
    headObject.mockResolvedValue({ size: 1234, contentType: "image/png" });

    const result = await confirmUpload("user-1", imageKey, "image");

    expect(result).toEqual({
      success: true,
      error: null,
      data: { size: 1234 },
    });
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("deletes an object over the limit", async () => {
    headObject.mockResolvedValue({
      size: 5 * MB + 1,
      contentType: "image/png",
    });

    const result = await confirmUpload("user-1", imageKey, "image");

    expect(result.success).toBe(false);
    expect(deleteObject).toHaveBeenCalledWith(imageKey);
  });

  it("deletes an object whose stored type differs from its key", async () => {
    headObject.mockResolvedValue({ size: 100, contentType: "text/html" });

    const result = await confirmUpload("user-1", imageKey, "image");

    expect(result.success).toBe(false);
    expect(deleteObject).toHaveBeenCalledWith(imageKey);
  });

  it("rejects a key of another kind without reading it", async () => {
    const result = await confirmUpload(
      "user-1",
      "users/user-1/doc.pdf",
      "image",
    );

    expect(result.success).toBe(false);
    expect(headObject).not.toHaveBeenCalled();
  });

  it("never touches another user's object", async () => {
    const result = await confirmUpload("user-2", imageKey, "image");

    expect(result.success).toBe(false);
    expect(headObject).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("fails when nothing was uploaded", async () => {
    headObject.mockResolvedValue(null);

    const result = await confirmUpload("user-1", imageKey, "image");

    expect(result.success).toBe(false);
  });
});

describe("deleteUserObject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses a key outside the user's prefix", async () => {
    const result = await deleteUserObject("user-2", imageKey);

    expect(result.success).toBe(false);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("lets an R2 failure through, so the caller keeps its row", async () => {
    deleteObject.mockRejectedValue(new Error("R2 down"));

    await expect(deleteUserObject("user-1", imageKey)).rejects.toThrow(
      "R2 down",
    );
  });
});

describe("purgeUserObjects", () => {
  it("purges only the user's own prefix", async () => {
    await purgeUserObjects("user-1");

    expect(deletePrefix).toHaveBeenCalledWith("users/user-1/");
  });
});

describe("signFileUrls", () => {
  it("signs the same moment for renders in one window", async () => {
    signGetUrl.mockResolvedValue("https://r2.example/get");

    await signFileUrls(imageKey, "cat.png", new Date("2026-10-30T10:05:00Z"));
    await signFileUrls(imageKey, "cat.png", new Date("2026-10-30T10:55:00Z"));

    const dates = signGetUrl.mock.calls.map(
      ([, options]) => options.signingDate,
    );
    expect(new Set(dates.map((date: Date) => date.getTime())).size).toBe(1);
  });
});
