import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getReconcileRows: vi.fn(),
  getRowSubscriptions: vi.fn(),
  syncSubscription: vi.fn(),
  list: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(async () => {}),
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
  logger: { error: mocks.error, warn: mocks.warn, info: vi.fn() },
}));

import { reconcileSubscriptions } from "@/features/billing/services/reconciliation";

const NOW = new Date();
const LATER = Date.now() + 60_000;

beforeEach(() => {
  vi.restoreAllMocks();
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
      request: { timeout: 5_000, maxNetworkRetries: 0 },
    });
    expect(report).toEqual({
      counts: {
        checked: 2,
        corrected: 1,
        missingRow: 0,
        duplicate: 0,
        failed: 0,
      },
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
      request: { timeout: 5_000, maxNetworkRetries: 0 },
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

  // The lost checkout must be repaired also when the rows never end.
  it("runs the second pass when the first one runs out of its share", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    mocks.getReconcileRows.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        customerId: `cus_${i}`,
        subscriptionId: `sub_${i}`,
      })),
    );
    mocks.syncSubscription.mockImplementation(async () => {
      clock += 1_000;
      return "unchanged";
    });
    mocks.list.mockResolvedValue({
      data: [{ id: "sub_new", customer: "cus_new", status: "active" }],
      has_more: false,
    });
    mocks.getRowSubscriptions.mockResolvedValue(
      new Map([["cus_new", { subscriptionId: null, status: "incomplete" }]]),
    );

    const report = await reconcileSubscriptions({ now: NOW, deadline: 10_000 });

    expect(report.stoppedEarly).toBe(true);
    expect(mocks.syncSubscription).toHaveBeenCalledTimes(7);
    expect(mocks.syncSubscription).toHaveBeenLastCalledWith(
      "cus_new",
      "sub_new",
      expect.anything(),
    );
  });

  it("stops inside a page of the second pass", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    mocks.getReconcileRows.mockResolvedValue([]);
    mocks.list.mockResolvedValue({
      data: Array.from({ length: 100 }, (_, i) => ({
        id: `sub_${i}`,
        customer: `cus_${i}`,
        status: "active",
      })),
      has_more: false,
    });
    mocks.getRowSubscriptions.mockResolvedValue(
      new Map(
        Array.from({ length: 100 }, (_, i) => [
          `cus_${i}`,
          { subscriptionId: null, status: "incomplete" },
        ]),
      ),
    );
    mocks.syncSubscription.mockImplementation(async () => {
      clock += 1_000;
      return "corrected";
    });

    const report = await reconcileSubscriptions({ now: NOW, deadline: 5_000 });

    expect(report.stoppedEarly).toBe(true);
    expect(mocks.syncSubscription).toHaveBeenCalledTimes(6);
  });

  it("starts at another row the next day", async () => {
    mocks.getReconcileRows.mockResolvedValue(
      Array.from({ length: 100 }, (_, i) => ({
        customerId: `cus_${i}`,
        subscriptionId: `sub_${i}`,
      })),
    );
    const firstOf = async (now: string) => {
      mocks.syncSubscription.mockClear();
      await reconcileSubscriptions({ now: new Date(now), deadline: LATER });
      return mocks.syncSubscription.mock.calls[0][0];
    };

    expect(await firstOf("2026-11-25T03:00:00Z")).not.toBe(
      await firstOf("2026-11-24T03:00:00Z"),
    );
  });

  // It would otherwise end the job at the same row every day.
  it("goes on after a row that fails, logs its ids and counts it", async () => {
    mocks.syncSubscription.mockRejectedValueOnce(new Error("Stripe 500"));

    const report = await reconcileSubscriptions({ now: NOW, deadline: LATER });

    expect(report.counts).toMatchObject({ checked: 1, failed: 1 });
    expect(mocks.list).toHaveBeenCalledOnce();
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith(
      "Reconciling a subscription failed",
      expect.objectContaining({
        customerId: expect.any(String),
        subscriptionId: expect.any(String),
      }),
    );
  });

  // The run shows as failed: an outage of Stripe is no row's fault.
  it("fails when Stripe's own list fails", async () => {
    mocks.list.mockRejectedValue(new Error("Stripe is down"));

    await expect(
      reconcileSubscriptions({ now: NOW, deadline: LATER }),
    ).rejects.toThrow("Stripe is down");
  });

  it("gives up on a Stripe request long before the run ends", async () => {
    await reconcileSubscriptions({ now: NOW, deadline: LATER });

    expect(mocks.list).toHaveBeenCalledWith(expect.anything(), {
      timeout: 5_000,
      maxNetworkRetries: 0,
    });
  });
});
