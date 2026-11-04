import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { collection: { findMany } } }));

import { getCollectionOptions } from "@/features/collections/queries";

describe("getCollectionOptions", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads only the caller's collections", async () => {
    await getCollectionOptions("user-1");

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
  });

  // The item forms read this as ItemCollectionRef (ADR 0008), and the route
  // sends it as it is, so an added column would reach the browser.
  it("selects only the id and name, ordered by name", async () => {
    await getCollectionOptions("user-1");

    const { select, orderBy } = findMany.mock.calls[0][0];
    expect(select).toEqual({ id: true, name: true });
    expect(orderBy).toEqual({ name: "asc" });
  });
});
