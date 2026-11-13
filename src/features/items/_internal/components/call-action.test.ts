import { beforeEach, describe, expect, it, vi } from "vitest";

const { toastError, rethrow } = vi.hoisted(() => ({
  toastError: vi.fn(),
  rethrow: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));

import { callAction } from "@/features/items/_internal/components/call-action";
import { createErrorText } from "@/i18n/error-text";

const FAIL_CODE = "itemSaveFailed";
const errorText = createErrorText();

beforeEach(() => {
  vi.resetAllMocks();
});

describe("callAction", () => {
  it("is the data of a success, with no toast", async () => {
    const data = { id: "item-1" };

    await expect(
      callAction(
        async () => ({ success: true, data, error: null }),
        FAIL_CODE,
        errorText,
      ),
    ).resolves.toBe(data);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("is null for a refused result, which shows the words of the server's code", async () => {
    await expect(
      callAction(
        async () => ({ success: false, data: null, error: "itemNotFound" }),
        FAIL_CODE,
        errorText,
      ),
    ).resolves.toBeNull();
    expect(toastError).toHaveBeenCalledExactlyOnceWith("Item not found");
  });

  it("lets Next look at a thrown error first, then shows its own message", async () => {
    const failure = new Error("network");

    await expect(
      callAction(
        async () => {
          throw failure;
        },
        FAIL_CODE,
        errorText,
      ),
    ).resolves.toBeNull();
    expect(rethrow).toHaveBeenCalledExactlyOnceWith(failure);
    expect(toastError).toHaveBeenCalledExactlyOnceWith(
      "Couldn't save the item",
    );
  });
});
