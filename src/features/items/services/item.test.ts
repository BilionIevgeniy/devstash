import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  create,
  update,
  remove,
  findFirst,
  getItemTypeByName,
  getEntitlements,
  confirmUpload,
  deleteUserObject,
  signFileUrls,
} = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findFirst: vi.fn(),
  getItemTypeByName: vi.fn(),
  getEntitlements: vi.fn(),
  confirmUpload: vi.fn(),
  deleteUserObject: vi.fn(),
  signFileUrls: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { item: { create, update, delete: remove, findFirst } },
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/features/files/services/objects", () => ({
  confirmUpload,
  deleteUserObject,
  signFileUrls,
}));
// Partial: the items queries also use the real itemTypeSelect.
vi.mock("@/features/item-types/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/item-types/queries")>()),
  getItemTypeByName,
}));

import { Prisma } from "@/generated/prisma/client";
import {
  createUserItem,
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

describe("createUserItem", () => {
  const snippet = {
    typeName: "snippet" as const,
    title: "useDebounce",
    description: null,
    content: "export function useDebounce() {}",
    language: "ts",
    url: null,
    tags: [],
  };

  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: "item-1" });
    getItemTypeByName.mockReset().mockImplementation(async (name: string) => ({
      id: `type-${name}`,
      name,
      icon: "Code",
    }));
  });

  it("writes the item for the caller with its type and content type", async () => {
    const result = await createUserItem("user-1", snippet);

    expect(create.mock.calls[0][0].data).toMatchObject({
      userId: "user-1",
      typeId: "type-snippet",
      contentType: "TEXT",
      title: "useDebounce",
      content: "export function useDebounce() {}",
      language: "ts",
    });
    expect(result).toEqual({
      success: true,
      error: null,
      data: { id: "item-1" },
    });
  });

  it("stores a link as a URL item", async () => {
    await createUserItem("user-1", {
      ...snippet,
      typeName: "link",
      url: "https://react.dev",
    });

    expect(create.mock.calls[0][0].data).toMatchObject({
      typeId: "type-link",
      contentType: "URL",
      url: "https://react.dev",
    });
  });

  it("drops the fields the type does not have", async () => {
    await createUserItem("user-1", {
      ...snippet,
      typeName: "note",
      url: "https://react.dev",
    });

    const { data } = create.mock.calls[0][0];
    expect(data).toHaveProperty("content");
    expect(data).not.toHaveProperty("language");
    expect(data).not.toHaveProperty("url");
  });

  it("links tags of the caller", async () => {
    await createUserItem("user-1", { ...snippet, tags: ["react"] });

    expect(create.mock.calls[0][0].data.tags).toEqual({
      create: [
        {
          tag: {
            connectOrCreate: {
              where: { userId_name: { userId: "user-1", name: "react" } },
              create: { userId: "user-1", name: "react" },
            },
          },
        },
      ],
    });
  });

  it("writes nothing when the system type is missing", async () => {
    getItemTypeByName.mockResolvedValue(null);

    const result = await createUserItem("user-1", snippet);

    expect(result).toEqual({
      success: false,
      error: "Invalid item type",
      data: null,
    });
    expect(create).not.toHaveBeenCalled();
  });

  describe("with an upload", () => {
    const upload = { key: "users/user-1/abc.png", name: "cat.png" };
    const image = { ...snippet, typeName: "image" as const, file: upload };

    beforeEach(() => {
      getEntitlements.mockReset().mockResolvedValue({ isPro: true });
      confirmUpload.mockReset().mockResolvedValue({
        success: true,
        error: null,
        data: { size: 4096 },
      });
    });

    it("stores the key, the name and the size R2 reports", async () => {
      await createUserItem("user-1", image);

      expect(confirmUpload).toHaveBeenCalledWith("user-1", upload.key, "image");
      expect(create.mock.calls[0][0].data).toMatchObject({
        contentType: "FILE",
        fileKey: upload.key,
        fileName: "cat.png",
        fileSize: 4096,
      });
    });

    it("refuses a Free user before looking at the upload", async () => {
      getEntitlements.mockResolvedValue({ isPro: false });

      const result = await createUserItem("user-1", image);

      expect(result.success).toBe(false);
      expect(confirmUpload).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });

    it("writes no row when the upload is not confirmed", async () => {
      confirmUpload.mockResolvedValue({
        success: false,
        error: "Images can be up to 5 MB",
        data: null,
      });

      const result = await createUserItem("user-1", image);

      expect(result.error).toBe("Images can be up to 5 MB");
      expect(create).not.toHaveBeenCalled();
    });

    it("answers in plain words when the upload is already on another item", async () => {
      create.mockRejectedValue(prismaError("P2002"));

      const result = await createUserItem("user-1", image);

      expect(result).toEqual({
        success: false,
        error: "This file is already saved on another item",
        data: null,
      });
    });

    it("never writes a file on a type without one", async () => {
      await createUserItem("user-1", { ...snippet, file: upload });

      expect(confirmUpload).not.toHaveBeenCalled();
      expect(create.mock.calls[0][0].data).not.toHaveProperty("fileKey");
    });
  });
});

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
    findFirst.mockReset().mockResolvedValue({ fileKey: null });
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
