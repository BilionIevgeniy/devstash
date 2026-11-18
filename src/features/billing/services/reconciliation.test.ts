import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getReconcileRows: vi.fn(),
  getRowSubscriptions: vi.fn(),
  syncSubscription: vi.fn(),
  list: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/features/billing/_internal/queries", () => ({
  getReconcileRows: mocks.getReconcileRows,
  getRowSubscriptions: mocks.getRowSubscriptions,
}));
vi.mock("@/features/billing/_internal/services/subscription-sync", () => ({
  syncSubscription: mocks.syncSubscription,
}));
vi.mock("@/lib/vendors/stripe", () => ({
  getStripe: () => ({ subscriptions: { list: mocks.list } }),
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: vi.fn(async () => {}), warn: mocks.warn, info: vi.fn() },
}));

import { reconcileSubscriptions } from "@/features/billing/services/reconciliation";

const NOW = new Date();
const LATER = Date.now() + 60_000;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getReconcileRows.mockResolvedValue([
    { customerId: "cus_1", subscriptionId: "sub_1" },
    { customerId: "cus_2", subscriptionId: "sub_2" },
  ]);
  mocks.syncSubscription.mockResolvedValue("unchanged");
  mocks.list.mockResolvedValue({ data: [], has_more: false });
  mocks.getRowSubscriptions.mockResolvedValue(new Map());
});

describe("reconcileSubscriptions", () => {
  it("syncs every row and counts what it corrected", async () => {
    mocks.syncSubscription
      .mockResolvedValueOnce("corrected")
      .mockResolvedValueOnce("unchanged");

    const report = await reconcileSubscriptions({ now: NOW, deadline: LATER });

    expect(mocks.syncSubscription).toHaveBeenCalledWith("cus_1", "sub_1", {
      quiet: true,
    });
    expect(report).toEqual({
      counts: { checked: 2, corrected: 1, missingRow: 0, duplicate: 0 },
      stoppedEarly: false,
    });
  });

  it("syncs a live Stripe subscription its row does not name", async () => {
    mocks.getReconcileRows.mockResolvedValue([]);
    mocks.list.mockResolvedValue({
      data: [
        { id: "sub_new", customer: "cus_1", status: "active" },
        { id: "sub_2", customer: "cus_2", status: "active" },
        { id: "sub_old", customer: "cus_3", status: "incomplete_expired" },
      ],
      has_more: false,
    });
    mocks.getRowSubscriptions.mockResolvedValue(
      new Map([
        ["cus_1", { subscriptionId: null, status: "incomplete" }],
        ["cus_2", { subscriptionId: "sub_2", status: "active" }],
        ["cus_3", { subscriptionId: null, status: "canceled" }],
      ]),
    );

    await reconcileSubscriptions({ now: NOW, deadline: LATER });

    expect(mocks.syncSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.syncSubscription).toHaveBeenCalledWith("cus_1", "sub_new", {
      quiet: true,
    });
  });

  it("counts foreign subscriptions and warns once per run", async () => {
    mocks.getReconcileRows.mockResolvedValue([]);
    mocks.list.mockResolvedValue({
      data: [
        { id: "sub_x", customer: "cus_x", status: "active" },
        { id: "sub_y", customer: "cus_y", status: "active" },
      ],
      has_more: false,
    });

    const report = await reconcileSubscriptions({ now: NOW, deadline: LATER });

    expect(report.counts.missingRow).toBe(2);
    expect(mocks.warn).toHaveBeenCalledTimes(1);
  });

  it("leaves a second live subscription to a person and never syncs it", async () => {
    mocks.getReconcileRows.mockResolvedValue([]);
    mocks.list.mockResolvedValue({
      data: [{ id: "sub_2", customer: "cus_1", status: "active" }],
      has_more: false,
    });
    mocks.getRowSubscriptions.mockResolvedValue(
      new Map([["cus_1", { subscriptionId: "sub_1", status: "active" }]]),
    );

    const report = await reconcileSubscriptions({ now: NOW, deadline: LATER });

    expect(mocks.syncSubscription).not.toHaveBeenCalled();
    expect(report.counts.duplicate).toBe(1);
  });

  it("pages through Stripe", async () => {
    mocks.getReconcileRows.mockResolvedValue([]);
    mocks.list
      .mockResolvedValueOnce({
        data: [{ id: "sub_a", customer: "cus_a", status: "canceled" }],
        has_more: true,
      })
      .mockResolvedValueOnce({ data: [], has_more: false });

    await reconcileSubscriptions({ now: NOW, deadline: LATER });

    expect(mocks.list.mock.calls[1][0]).toMatchObject({
      starting_after: "sub_a",
    });
  });

  it("stops at the deadline and says so", async () => {
    const report = await reconcileSubscriptions({
      now: NOW,
      deadline: Date.now() - 1,
    });

    expect(mocks.syncSubscription).not.toHaveBeenCalled();
    expect(report.stoppedEarly).toBe(true);
  });
});
