import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEntitlements } = vi.hoisted(() => ({ getEntitlements: vi.fn() }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));

import { userCanUseType } from "@/features/items/services/type-access";

describe("userCanUseType", () => {
  beforeEach(() => {
    getEntitlements.mockReset();
  });

  it("refuses a Pro type to a Free user", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(userCanUseType("user-1", "file")).resolves.toBe(false);
    await expect(userCanUseType("user-1", "image")).resolves.toBe(false);
  });

  it("gives a Pro type to a Pro user", async () => {
    getEntitlements.mockResolvedValue({ isPro: true });

    await expect(userCanUseType("user-1", "file")).resolves.toBe(true);
  });

  it("does not read the plan for a type open to every plan", async () => {
    await expect(userCanUseType("user-1", "snippet")).resolves.toBe(true);

    expect(getEntitlements).not.toHaveBeenCalled();
  });
});
