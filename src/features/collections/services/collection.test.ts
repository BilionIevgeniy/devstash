import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeRaw,
  updateMany,
  deleteMany,
  deleteItems,
  create,
  count,
  transaction,
  lock,
  getEntitlements,
} = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  deleteItems: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(),
  lock: vi.fn(),
  getEntitlements: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: executeRaw,
    $transaction: transaction,
    collection: { create, updateMany, deleteMany },
    item: { deleteMany: deleteItems },
  },
}));
vi.mock("@/lib/advisory-lock", () => ({
  LOCKED_TRANSACTION: {},
  lockForTransaction: lock,
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));

import {
  createUserCollection,
  deleteUserCollection,
  setUserCollectionFavorite,
  updateUserCollection,
} from "@/features/collections/services/collection";

const GONE = { success: false, error: "This collection no longer exists." };

describe("createUserCollection", () => {
  const input = { name: "React Patterns", description: null };

  beforeEach(() => {
    vi.resetAllMocks();
    getEntitlements.mockResolvedValue({ isPro: false });
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "collection-1" });
    transaction.mockImplementation((run: (tx: unknown) => unknown) =>
      run({ collection: { create, count } }),
    );
  });

  it("creates the collection under the limit, counting inside the lock", async () => {
    count.mockResolvedValue(2);

    await expect(createUserCollection("user-1", input)).resolves.toEqual({
      success: true,
      error: null,
      data: { id: "collection-1" },
    });

    expect(lock.mock.calls[0][1]).toBe("free-collections:user-1");
    expect(count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(
      count.mock.invocationCallOrder[0],
    );
    expect(create.mock.calls[0][0].data).toEqual({
      userId: "user-1",
      ...input,
    });
  });

  it("refuses the collection at the limit and writes nothing", async () => {
    count.mockResolvedValue(3);

    await expect(createUserCollection("user-1", input)).resolves.toEqual({
      success: false,
      error:
        "You have reached the Free plan's limit of 3 collections. Upgrade to Pro for unlimited collections.",
      data: null,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("lets Pro skip the lock and the count", async () => {
    getEntitlements.mockResolvedValue({ isPro: true });

    const result = await createUserCollection("user-1", input);

    expect(result.success).toBe(true);
    expect(transaction).not.toHaveBeenCalled();
    expect(lock).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});

describe("setUserCollectionFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes only through the caller's id, with no updatedAt", async () => {
    executeRaw.mockResolvedValue(1);

    await expect(
      setUserCollectionFavorite("user-1", "collection-1", true),
    ).resolves.toEqual({ success: true, error: null });

    const [strings, isFavorite, favoritedAt, id, userId] =
      executeRaw.mock.calls[0];
    expect(strings.join("")).not.toContain("updatedAt");
    expect(isFavorite).toBe(true);
    expect(favoritedAt).toBeInstanceOf(Date);
    expect(id).toBe("collection-1");
    expect(userId).toBe("user-1");
  });

  it("clears the star date when the favorite is removed", async () => {
    executeRaw.mockResolvedValue(1);

    await setUserCollectionFavorite("user-1", "collection-1", false);

    expect(executeRaw.mock.calls[0][2]).toBeNull();
  });

  it("reports a missing or foreign collection", async () => {
    executeRaw.mockResolvedValue(0);

    await expect(
      setUserCollectionFavorite("user-1", "collection-1", true),
    ).resolves.toEqual(GONE);
  });
});

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
