import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStaleRegistrationIds: vi.fn(),
  verifyStaleRegistration: vi.fn(),
  removeVerifiedAccount: vi.fn(),
}));
vi.mock("@/features/auth/queries", () => ({
  getStaleRegistrationIds: mocks.getStaleRegistrationIds,
}));
vi.mock("@/features/auth/services/account", () => ({
  verifyStaleRegistration: mocks.verifyStaleRegistration,
}));
vi.mock("@/features/account/_internal/services/remove-account", () => ({
  removeVerifiedAccount: mocks.removeVerifiedAccount,
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: vi.fn(async () => {}), warn: vi.fn(), info: vi.fn() },
}));

import { purgeStaleRegistrations } from "@/features/account/services/retention";
import { fail, ok } from "@/lib/errors/action-result";

const NOW = new Date("2026-11-24T03:00:00Z");
const page = (from: number) =>
  Array.from({ length: 100 }, (_, i) => `user-${from + i}`);

let clock: number;
const purge = (deadline = 60_000) =>
  purgeStaleRegistrations({ now: NOW, deadline });

describe("purgeStaleRegistrations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    mocks.getStaleRegistrationIds.mockResolvedValue([]);
    mocks.verifyStaleRegistration.mockImplementation(async (userId) => ({
      userId,
    }));
    mocks.removeVerifiedAccount.mockResolvedValue(ok({ removed: true }));
  });

  it("counts each outcome and pages on after the last id", async () => {
    mocks.getStaleRegistrationIds
      .mockResolvedValueOnce(["a", "b", "c", "d", "e"])
      .mockResolvedValueOnce([]);
    mocks.verifyStaleRegistration.mockResolvedValueOnce(null);
    mocks.removeVerifiedAccount
      .mockResolvedValueOnce(ok({ removed: true }))
      .mockResolvedValueOnce(fail("filesPurgeFailed"))
      .mockRejectedValueOnce(new Error("database down"))
      // Verified between the check and the delete.
      .mockResolvedValueOnce(ok({ removed: false }));

    await expect(purge()).resolves.toEqual({
      counts: { deleted: 1, skipped: 2, failed: 2 },
      stoppedEarly: false,
    });
    expect(mocks.getStaleRegistrationIds.mock.calls[1][1]).toBe("e");
    // The cutoff is the run's own, and only a proof is deleted.
    expect(mocks.verifyStaleRegistration).toHaveBeenCalledWith("b", NOW);
    expect(mocks.removeVerifiedAccount).toHaveBeenCalledWith({ userId: "b" });
    expect(mocks.removeVerifiedAccount).not.toHaveBeenCalledWith({
      userId: "a",
    });
  });

  // A page of 100 deletions would pass the function's 60 seconds, and no job
  // after this one would ever run.
  it("stops inside a page at the deadline", async () => {
    mocks.getStaleRegistrationIds.mockResolvedValue(page(0));
    mocks.removeVerifiedAccount.mockImplementation(async () => {
      clock += 1_000;
      return ok({ removed: true });
    });

    await expect(purge(5_000)).resolves.toEqual({
      counts: { deleted: 6, skipped: 0, failed: 0 },
      stoppedEarly: true,
    });
  });

  it("deletes nobody when the time is already over", async () => {
    mocks.getStaleRegistrationIds.mockResolvedValue(page(0));
    clock = 10;

    await expect(purge(5)).resolves.toMatchObject({ stoppedEarly: true });
    expect(mocks.removeVerifiedAccount).not.toHaveBeenCalled();
  });
});
