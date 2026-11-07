import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  update,
  remove,
  findFirst,
  deleteTags,
  executeRaw,
  deleteUserObject,
  signFileUrls,
} = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  findFirst: vi.fn(),
  deleteTags: vi.fn(),
  executeRaw: vi.fn(),
  deleteUserObject: vi.fn(),
  signFileUrls: vi.fn(),
}));
const getEntitlements = vi.hoisted(() => vi.fn());
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: executeRaw,
    item: { update, delete: remove, findFirst },
    tag: { deleteMany: deleteTags },
  },
}));
vi.mock("@/features/files/services/objects", () => ({
  deleteUserObject,
  signFileUrls,
}));

import { Prisma } from "@/generated/prisma/client";
import {
  deleteUserItem,
  setUserItemContent,
  setUserItemFavorite,
  setUserItemPin,
  updateUserItem,
} from "@/features/items/services/item";

describe("setUserItemFavorite", () => {
  beforeEach(() => {
    executeRaw.mockReset();
  });

  it("writes only through the caller's id, with no updatedAt", async () => {
    executeRaw.mockResolvedValue(1);

    await expect(
      setUserItemFavorite("user-1", "item-1", true),
    ).resolves.toEqual({ success: true, error: null });

    const [strings, isFavorite, favoritedAt, id, userId] =
      executeRaw.mock.calls[0];
    expect(strings.join("")).not.toContain("updatedAt");
    expect(isFavorite).toBe(true);
    expect(favoritedAt).toBeInstanceOf(Date);
    expect(id).toBe("item-1");
    expect(userId).toBe("user-1");
  });

  it("clears the star date when the favorite is removed", async () => {
    executeRaw.mockResolvedValue(1);

    await setUserItemFavorite("user-1", "item-1", false);

    expect(executeRaw.mock.calls[0][2]).toBeNull();
  });

  it("reports a missing or foreign item", async () => {
    executeRaw.mockResolvedValue(0);

    await expect(
      setUserItemFavorite("user-1", "item-1", true),
    ).resolves.toEqual({ success: false, error: "Item not found" });
  });
});

describe("setUserItemPin", () => {
  beforeEach(() => {
    executeRaw.mockReset();
  });

  it.each([true, false])(
    "writes %s only through the caller's id, with no updatedAt",
    async (value) => {
      executeRaw.mockResolvedValue(1);

      await expect(setUserItemPin("user-1", "item-1", value)).resolves.toEqual({
        success: true,
        error: null,
      });

      const [strings, isPinned, id, userId] = executeRaw.mock.calls[0];
      const sql = strings.join("?");
      expect(sql).not.toContain("updatedAt");
      expect(sql).toContain('SET "isPinned" = ?');
      expect(sql).toContain('WHERE "id" = ? AND "userId" = ?');
      expect(isPinned).toBe(value);
      expect(id).toBe("item-1");
      expect(userId).toBe("user-1");
    },
  );

  it("reports a missing or foreign item", async () => {
    executeRaw.mockResolvedValue(0);

    await expect(setUserItemPin("user-1", "item-1", true)).resolves.toEqual({
      success: false,
      error: "Item not found",
    });
  });
});

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
  fileKey: null,
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

describe("setUserItemContent", () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({ id: "item-1" });
    findFirst.mockReset().mockResolvedValue({
      ...rawItem,
      type: { ...rawItem.type, name: "prompt" },
    });
  });

  it("writes only the content, through the caller's id", async () => {
    const result = await setUserItemContent("user-1", "item-1", "Better");

    expect(result.success).toBe(true);
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "item-1",
      userId: "user-1",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1", userId: "user-1" },
        data: { content: "Better" },
      }),
    );
  });

  it("refuses a type without content, without writing", async () => {
    findFirst.mockResolvedValue({ ...rawItem, type: { name: "link" } });

    const result = await setUserItemContent("user-1", "item-1", "Better");

    expect(result).toEqual({
      success: false,
      error: "This item has no text content",
      data: null,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("answers not found when the item is missing or someone else's", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      setUserItemContent("user-1", "item-1", "Better"),
    ).resolves.toMatchObject({ success: false, error: "Item not found" });
    expect(update).not.toHaveBeenCalled();
  });

  it("answers not found when the item is deleted before the write", async () => {
    update.mockRejectedValue(prismaError("P2025"));

    await expect(
      setUserItemContent("user-1", "item-1", "Better"),
    ).resolves.toMatchObject({ success: false, error: "Item not found" });
  });
});

describe("updateUserItem", () => {
  const renamed = { title: "Renamed", tags: [], collectionIds: [] };

  beforeEach(() => {
    update.mockReset().mockResolvedValue({ id: "item-1" });
    findFirst.mockReset().mockResolvedValue(rawItem);
    deleteTags.mockReset().mockResolvedValue({ count: 0 });
  });

  // The answer of a save carries signed URLs.
  it("refuses a file item to a Free user, without writing", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });
    findFirst.mockResolvedValue({ ...rawItem, type: { name: "file" } });

    const result = await updateUserItem("user-1", "item-1", { ...renamed });

    expect(result).toEqual({
      success: false,
      error: "Files and images are a Pro feature",
      data: null,
    });
    expect(update).not.toHaveBeenCalled();
    expect(signFileUrls).not.toHaveBeenCalled();
  });

  it("writes only an item that belongs to the caller", async () => {
    await updateUserItem("user-1", "item-1", { ...renamed });

    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "item-1",
      userId: "user-1",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
  });

  it("answers not found without writing when the item is missing or someone else's", async () => {
    findFirst.mockResolvedValue(null);

    const result = await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: [],
      collectionIds: [],
    });

    expect(result).toEqual({
      success: false,
      error: "Item not found",
      data: null,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("answers in plain words when the item or a collection is gone by the write", async () => {
    update.mockRejectedValue(prismaError("P2025"));

    const result = await updateUserItem("user-1", "item-1", renamed);

    expect(result).toEqual({
      success: false,
      error: "This item or one of its collections no longer exists",
      data: null,
    });
  });

  it("drops the fields the item's type does not have", async () => {
    findFirst.mockResolvedValue({ ...rawItem, type: { name: "link" } });

    await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      content: "stray",
      language: "ts",
      url: "https://react.dev",
      tags: [],
      collectionIds: [],
    });

    const { data } = update.mock.calls[0][0];
    expect(data).toMatchObject({ url: "https://react.dev" });
    expect(data).not.toHaveProperty("content");
    expect(data).not.toHaveProperty("language");
  });

  it("refuses to clear the URL of a link", async () => {
    findFirst.mockResolvedValue({ ...rawItem, type: { name: "link" } });

    const result = await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      url: null,
      tags: [],
      collectionIds: [],
    });

    expect(result).toEqual({
      success: false,
      error: "URL is required",
      data: null,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("removes the caller's tags no item uses any more", async () => {
    await updateUserItem("user-1", "item-1", { ...renamed });

    expect(deleteTags).toHaveBeenCalledWith({
      where: { userId: "user-1", items: { none: {} } },
    });
  });

  it("still reports the save when the tag cleanup fails", async () => {
    deleteTags.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: [],
      collectionIds: [],
    });

    expect(result.success).toBe(true);
  });

  it("replaces the tags with tags of the caller", async () => {
    await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: ["shell"],
      collectionIds: [],
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

  it("keeps the links that stay, so their addedAt survives the save", async () => {
    findFirst.mockResolvedValue({
      ...rawItem,
      collections: [{ collectionId: "col-1" }, { collectionId: "col-2" }],
    });

    await updateUserItem("user-1", "item-1", {
      ...renamed,
      collectionIds: ["col-1", "col-3"],
    });

    expect(update.mock.calls[0][0].data.collections).toEqual({
      deleteMany: { collectionId: { notIn: ["col-1", "col-3"] } },
      create: [{ collection: { connect: { id: "col-3", userId: "user-1" } } }],
    });
  });

  it("leaves the fields that were not sent out of the write", async () => {
    await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      description: null,
      tags: [],
      collectionIds: [],
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
      collectionIds: [],
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "item-1", tags: ["shell"] });
  });

  it("answers not found when the item is gone by the time it is read back", async () => {
    findFirst.mockResolvedValueOnce(rawItem).mockResolvedValueOnce(null);

    const result = await updateUserItem("user-1", "item-1", {
      title: "Renamed",
      tags: [],
      collectionIds: [],
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
      updateUserItem("user-1", "item-1", { ...renamed }),
    ).rejects.toThrow("failed");
  });
});

describe("deleteUserItem", () => {
  beforeEach(() => {
    remove.mockReset().mockResolvedValue({ id: "item-1" });
    findFirst.mockReset().mockResolvedValue({ fileKey: null });
    deleteTags.mockReset().mockResolvedValue({ count: 0 });
    deleteUserObject
      .mockReset()
      .mockResolvedValue({ success: true, error: null });
  });

  it("answers not found without deleting when the read finds nothing", async () => {
    findFirst.mockResolvedValue(null);

    const result = await deleteUserItem("user-1", "item-1");

    expect(result).toEqual({ success: false, error: "Item not found" });
    expect(remove).not.toHaveBeenCalled();
  });

  // A locked file counts toward the Free limit, and the data is the user's own:
  // a plan check here would leave a Free user stuck with it.
  it("deletes a file for a Free user, with no read of the plan", async () => {
    getEntitlements.mockReset().mockResolvedValue({ isPro: false });
    findFirst.mockResolvedValue({ fileKey: "users/user-1/abc.pdf" });

    const result = await deleteUserItem("user-1", "item-1");

    expect(result.success).toBe(true);
    expect(remove).toHaveBeenCalled();
    expect(getEntitlements).not.toHaveBeenCalled();
  });

  it("deletes the file in R2 before the row", async () => {
    findFirst.mockResolvedValue({ fileKey: "users/user-1/abc.pdf" });

    await deleteUserItem("user-1", "item-1");

    expect(deleteUserObject).toHaveBeenCalledWith(
      "user-1",
      "users/user-1/abc.pdf",
    );
    expect(deleteUserObject.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0],
    );
  });

  it("keeps the row when the key is outside the owner's prefix", async () => {
    findFirst.mockResolvedValue({ fileKey: "users/someone-else/abc.pdf" });
    deleteUserObject.mockResolvedValue({ success: false, error: "not found" });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deleteUserItem("user-1", "item-1");

    expect(result).toEqual({
      success: false,
      error: "Couldn't delete the file. Please try again.",
    });
    expect(remove).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it("keeps the row when R2 fails, so the delete can be retried", async () => {
    findFirst.mockResolvedValue({ fileKey: "users/user-1/abc.pdf" });
    deleteUserObject.mockRejectedValue(new Error("R2 down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deleteUserItem("user-1", "item-1");

    expect(result).toEqual({
      success: false,
      error: "Couldn't delete the file. Please try again.",
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes only an item that belongs to the caller", async () => {
    const result = await deleteUserItem("user-1", "item-1");

    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
    expect(result).toEqual({ success: true, error: null });
    expect(deleteTags).toHaveBeenCalledWith({
      where: { userId: "user-1", items: { none: {} } },
    });
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
