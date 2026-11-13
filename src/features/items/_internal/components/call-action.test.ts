import { beforeEach, describe, expect, it, vi } from "vitest";

const { toastError, rethrow } = vi.hoisted(() => ({
  toastError: vi.fn(),
  rethrow: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));

import { callAction } from "@/features/items/_internal/components/call-action";

const FAIL_MESSAGE = "Couldn't save the item";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("callAction", () => {
  it("is the data of a success, with no toast", async () => {
    const data = { id: "item-1" };

    await expect(
      callAction(
        async () => ({ success: true, data, error: null }),
        FAIL_MESSAGE,
      ),
    ).resolves.toBe(data);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("is null for a refused result, which shows the server's words", async () => {
    await expect(
      callAction(
        async () => ({ success: false, data: null, error: "Item not found" }),
        FAIL_MESSAGE,
      ),
    ).resolves.toBeNull();
    expect(toastError).toHaveBeenCalledExactlyOnceWith("Item not found");
  });

  it("lets Next look at a thrown error first, then shows its own message", async () => {
    const failure = new Error("network");

    await expect(
      callAction(async () => {
        throw failure;
      }, FAIL_MESSAGE),
    ).resolves.toBeNull();
    expect(rethrow).toHaveBeenCalledExactlyOnceWith(failure);
    expect(toastError).toHaveBeenCalledExactlyOnceWith(FAIL_MESSAGE);
  });
});
