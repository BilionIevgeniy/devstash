import { beforeEach, describe, expect, it, vi } from "vitest";

const { update, remove, findFirst } = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  findFirst: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { item: { update, delete: remove, findFirst } },
}));

import { Prisma } from "@/generated/prisma/client";
import {
  deleteUserItem,
  updateUserItem,
} from "@/features/items/services/item";

const rawItem = {
  id: "item-1",
  title: "Renamed",
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
  contentType: "text",
  content: "echo hi",
  url: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  language: "bash",
  type: { id: "type-1", name: "command", icon: "Terminal", color: "#f97316" },
  tags: [{ tag: { name: "shell" } }],
  collections: [],
};

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("failed", {
    code,
    clientVersion: "test",
  });
}

describe("updateUserItem", () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({ id: "item-1" });
    findFirst.mockReset().mockResolvedValue(rawItem);
  });

  it("writes only an item that belongs to the caller", async () => {
    await updateUserItem("user-1", "item-1", { title: "Renamed", tags: [] });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
  });

  it("answers not found when the item is missing or someone else's", async () => {
    update.mockRejectedValue(prismaError("P2025"));

    const result = await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: [],
    });

    expect(result).toEqual({
      success: false,
      error: "Item not found",
      data: null,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("replaces the tags with tags of the caller", async () => {
    await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: ["shell"],
    });

    expect(update.mock.calls[0][0].data.tags).toEqual({
      deleteMany: {},
      create: [
        {
          tag: {
            connectOrCreate: {
              where: { userId_name: { userId: "user-1", name: "shell" } },
              create: { userId: "user-1", name: "shell" },
            },
          },
        },
      ],
    });
  });

  it("leaves the fields that were not sent out of the write", async () => {
    await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      description: null,
      tags: [],
    });

    const { data } = update.mock.calls[0][0];
    expect(data).toMatchObject({ title: "Renamed", description: null });
    expect(data).not.toHaveProperty("url");
    expect(data).not.toHaveProperty("content");
  });

  it("returns the updated item", async () => {
    const result = await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: ["shell"],
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "item-1", tags: ["shell"] });
  });

  it("answers not found when the item is gone by the time it is read back", async () => {
    findFirst.mockResolvedValue(null);

    const result = await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: [],
    });

    expect(result).toEqual({
      success: false,
      error: "Item not found",
      data: null,
    });
  });

  it("throws errors other than not found", async () => {
    update.mockRejectedValue(prismaError("P2002"));

    await expect(
      updateUserItem("user-1", "item-1", { title: "Renamed", tags: [] }),
    ).rejects.toThrow("failed");
  });
});

describe("deleteUserItem", () => {
  beforeEach(() => {
    remove.mockReset().mockResolvedValue({ id: "item-1" });
  });

  it("deletes only an item that belongs to the caller", async () => {
    const result = await deleteUserItem("user-1", "item-1");

    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
    expect(result).toEqual({ success: true, error: null });
  });

  it("answers not found when the item is missing or someone else's", async () => {
    remove.mockRejectedValue(prismaError("P2025"));

    const result = await deleteUserItem("user-1", "item-1");

    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("throws errors other than not found", async () => {
    remove.mockRejectedValue(prismaError("P2003"));

    await expect(deleteUserItem("user-1", "item-1")).rejects.toThrow("failed");
  });
});
