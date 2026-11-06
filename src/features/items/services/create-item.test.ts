import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  create,
  count,
  transaction,
  lock,
  getItemTypeByName,
  getEntitlements,
  confirmUpload,
} = vi.hoisted(() => ({
  create: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(),
  lock: vi.fn(),
  getItemTypeByName: vi.fn(),
  getEntitlements: vi.fn(),
  confirmUpload: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transaction, item: { create } },
}));
vi.mock("@/lib/advisory-lock", () => ({
  LOCKED_TRANSACTION: {},
  lockForTransaction: lock,
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/features/files/services/objects", () => ({ confirmUpload }));
vi.mock("@/features/item-types/queries", () => ({ getItemTypeByName }));

import { Prisma } from "@/generated/prisma/client";
import { createUserItem } from "@/features/items/services/create-item";

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
    collectionIds: [],
  };

  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: "item-1" });
    count.mockReset().mockResolvedValue(0);
    lock.mockReset();
    getEntitlements.mockReset().mockResolvedValue({ isPro: false });
    transaction
      .mockReset()
      .mockImplementation((run: (tx: unknown) => unknown) =>
        run({ item: { create, count } }),
      );
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

  it("links collections of the caller only", async () => {
    await createUserItem("user-1", { ...snippet, collectionIds: ["col-1"] });

    expect(create.mock.calls[0][0].data.collections).toEqual({
      create: [{ collection: { connect: { id: "col-1", userId: "user-1" } } }],
    });
  });

  it("answers in plain words when a collection is someone else's or gone", async () => {
    create.mockRejectedValue(prismaError("P2025"));

    const result = await createUserItem("user-1", {
      ...snippet,
      collectionIds: ["col-1"],
    });

    expect(result).toEqual({
      success: false,
      error: "One of the collections no longer exists",
      data: null,
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

  describe("the Free limit", () => {
    it("creates the item under the limit, counting inside the lock", async () => {
      count.mockResolvedValue(49);

      const result = await createUserItem("user-1", snippet);

      expect(result.success).toBe(true);
      expect(lock.mock.calls[0][1]).toBe("free-items:user-1");
      expect(count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
      expect(lock.mock.invocationCallOrder[0]).toBeLessThan(
        count.mock.invocationCallOrder[0],
      );
      expect(count.mock.invocationCallOrder[0]).toBeLessThan(
        create.mock.invocationCallOrder[0],
      );
    });

    it("refuses the item at the limit and writes nothing", async () => {
      count.mockResolvedValue(50);

      const result = await createUserItem("user-1", snippet);

      expect(result).toEqual({
        success: false,
        error:
          "You have reached the Free plan's limit of 50 items. Upgrade to Pro for unlimited items.",
        data: null,
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("lets Pro skip the lock and the count", async () => {
      getEntitlements.mockResolvedValue({ isPro: true });
      count.mockResolvedValue(500);

      const result = await createUserItem("user-1", snippet);

      expect(result.success).toBe(true);
      expect(transaction).not.toHaveBeenCalled();
      expect(lock).not.toHaveBeenCalled();
      expect(count).not.toHaveBeenCalled();
    });

    it("answers in plain words for a Pro user too when a collection is gone", async () => {
      getEntitlements.mockResolvedValue({ isPro: true });
      create.mockRejectedValue(prismaError("P2025"));

      const result = await createUserItem("user-1", snippet);

      expect(result.error).toBe("One of the collections no longer exists");
    });
  });

  describe("with an upload", () => {
    const upload = { key: "users/user-1/abc.png", name: "cat.png" };
    const image = { ...snippet, typeName: "image" as const, file: upload };

    beforeEach(() => {
      getEntitlements.mockResolvedValue({ isPro: true });
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
