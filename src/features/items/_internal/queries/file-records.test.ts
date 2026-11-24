import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, findMany } = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { item: { count, findMany } },
}));

import {
  countFileItems,
  getFileItemRecords,
} from "@/features/items/_internal/queries/file-records";

describe("getFileItemRecords", () => {
  const FILE_ITEMS = { userId: "user-1", fileKey: { not: null } };

  beforeEach(() => {
    count.mockReset().mockResolvedValue(30);
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads only the caller's items that have an upload, newest first", async () => {
    await getFileItemRecords("user-1", 2);

    expect(count).toHaveBeenCalledWith({ where: FILE_ITEMS });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: FILE_ITEMS,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 21,
        take: 21,
      }),
    );
  });

  it("counts by the same where", async () => {
    await expect(countFileItems("user-1")).resolves.toBe(30);

    expect(count).toHaveBeenCalledWith({ where: FILE_ITEMS });
  });
});
