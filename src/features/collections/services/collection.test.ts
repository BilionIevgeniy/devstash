import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMany, deleteMany, deleteItems } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  deleteItems: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: { updateMany, deleteMany },
    item: { deleteMany: deleteItems },
  },
}));

import {
  deleteUserCollection,
  updateUserCollection,
} from "@/features/collections/services/collection";

const GONE = { success: false, error: "This collection no longer exists." };

describe("updateUserCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes only the caller's collection", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    const result = await updateUserCollection("user-1", "col-1", {
      name: "Notes",
      description: null,
    });

    expect(result.success).toBe(true);
    expect(updateMany.mock.calls[0][0].where).toEqual({
      id: "col-1",
      userId: "user-1",
    });
  });

  it("fails in plain words when nothing matched", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateUserCollection("user-1", "col-2", { name: "Notes" }),
    ).resolves.toEqual(GONE);
  });
});

describe("deleteUserCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The cascade itself lives in the database: only the link rows go.
  it("deletes only the caller's collection and no items", async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteUserCollection("user-1", "col-1");

    expect(result.success).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
    });
    expect(deleteItems).not.toHaveBeenCalled();
  });

  it("fails in plain words when nothing matched", async () => {
    deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteUserCollection("user-1", "col-2")).resolves.toEqual(
      GONE,
    );
  });
});
