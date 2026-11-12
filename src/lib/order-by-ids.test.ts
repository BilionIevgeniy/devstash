import { describe, expect, it } from "vitest";

import { orderByIds } from "@/lib/order-by-ids";

const row = (id: string) => ({ id, name: id.toUpperCase() });

describe("orderByIds", () => {
  it("keeps the order of the ids, not of the rows", () => {
    expect(orderByIds(["b", "a", "c"], [row("a"), row("c"), row("b")])).toEqual(
      [row("b"), row("a"), row("c")],
    );
  });

  it("leaves out an id with no row", () => {
    expect(orderByIds(["a", "gone"], [row("a")])).toEqual([row("a")]);
  });

  it("gives a repeated id once", () => {
    expect(orderByIds(["a", "a"], [row("a")])).toEqual([row("a")]);
  });
});
