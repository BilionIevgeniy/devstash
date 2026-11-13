import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEntitlements,
  consumeRateLimit,
  getCollectionIdsByName,
  createUserCollection,
  getItemIdentities,
  createUserItem,
  logError,
} = vi.hoisted(() => ({
  getEntitlements: vi.fn(),
  consumeRateLimit: vi.fn(),
  getCollectionIdsByName: vi.fn(),
  createUserCollection: vi.fn(),
  getItemIdentities: vi.fn(),
  createUserItem: vi.fn(),
  logError: vi.fn(async () => {}),
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/features/collections/queries/import", () => ({
  getCollectionIdsByName,
}));
vi.mock("@/features/collections/services/collection", () => ({
  createUserCollection,
}));
vi.mock("@/features/items/queries/import", () => ({ getItemIdentities }));
vi.mock("@/features/items/services/create-item", () => ({ createUserItem }));
vi.mock("@/lib/logger", () => ({
  logger: { error: logError, warn: vi.fn(), info: vi.fn() },
}));

import {
  importUserCollections,
  importUserItems,
} from "@/features/import-export/services/import";

const snippet = (title: string, content: string) => ({
  type: "snippet",
  title,
  content,
  tags: [],
  collectionIds: [],
});

beforeEach(() => {
  vi.resetAllMocks();
  getEntitlements.mockResolvedValue({ isPro: true });
  consumeRateLimit.mockResolvedValue({ success: true, remaining: 1, reset: 0 });
  getCollectionIdsByName.mockResolvedValue(new Map());
  getItemIdentities.mockResolvedValue([]);
  let id = 0;
  const created = async () => ({
    success: true,
    error: null,
    data: { id: `new-${++id}` },
  });
  createUserCollection.mockImplementation(created);
  createUserItem.mockImplementation(created);
});

describe("import access", () => {
  it("refuses a Free user and writes nothing", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(
      importUserItems("user-1", [snippet("a", "b")]),
    ).resolves.toEqual({
      status: "forbidden",
    });
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(createUserItem).not.toHaveBeenCalled();
  });

  it("refuses a batch over the rate limit", async () => {
    consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 5,
    });

    await expect(importUserCollections("user-1", [])).resolves.toEqual({
      status: "rate-limited",
      reset: 5,
    });
  });
});

describe("importUserItems", () => {
  it("skips what the account has and what the batch repeats, keeps a same-titled different item", async () => {
    getItemIdentities.mockResolvedValue([
      { typeName: "snippet", title: "useDebounce", content: "ts", url: null },
    ]);

    const result = await importUserItems("user-1", [
      snippet("useDebounce", "ts"),
      snippet("useDebounce", "js"),
      snippet("useDebounce", "js"),
    ]);

    expect(result).toEqual({
      status: "ok",
      data: { created: 1, duplicates: 2, files: 0, failed: [] },
    });
    expect(createUserItem).toHaveBeenCalledTimes(1);
    expect(createUserItem.mock.calls[0][1]).toMatchObject({ content: "js" });
  });

  it("counts files apart and records each failure, then goes on", async () => {
    createUserItem
      .mockResolvedValueOnce({
        success: false,
        data: null,
        error: "itemLimitReached",
        params: { limit: 50 },
      })
      .mockRejectedValueOnce(new Error("db"))
      .mockResolvedValueOnce({
        success: true,
        error: null,
        data: { id: "i3" },
      });

    const result = await importUserItems("user-1", [
      { type: "file", title: "Spec" },
      { type: "snippet", title: "" },
      snippet("a", "1"),
      snippet("b", "2"),
      snippet("c", "3"),
    ]);

    expect(result).toEqual({
      status: "ok",
      data: {
        created: 1,
        duplicates: 0,
        files: 1,
        failed: [
          { title: null, reason: { error: "titleRequired" } },
          {
            title: "a",
            reason: { error: "itemLimitReached", params: { limit: 50 } },
          },
          { title: "b", reason: { error: "importRecordFailed" } },
        ],
      },
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });
});

describe("importUserCollections", () => {
  it("maps each exported id: an existing name to its collection, a new one to the created", async () => {
    getCollectionIdsByName.mockResolvedValue(
      new Map([["React", "existing-1"]]),
    );

    const result = await importUserCollections("user-1", [
      { id: "old-1", name: "React" },
      { id: "old-2", name: "Python" },
      { id: "old-3", name: "Python" },
      { name: "No id" },
    ]);

    expect(result).toEqual({
      status: "ok",
      data: {
        summary: {
          created: 1,
          duplicates: 2,
          files: 0,
          failed: [{ title: "No id", reason: { error: expect.any(String) } }],
        },
        idMap: { "old-1": "existing-1", "old-2": "new-1", "old-3": "new-1" },
      },
    });
    expect(createUserCollection).toHaveBeenCalledTimes(1);
  });
});
