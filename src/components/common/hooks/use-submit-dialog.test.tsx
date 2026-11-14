import { act, renderHook } from "../../../../test/intl";
import { describe, expect, it, vi } from "vitest";

import type { OperationResult } from "@/lib/action-result";

const { toast, rethrow } = vi.hoisted(() => ({
  toast: { error: vi.fn() },
  rethrow: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));

import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";

const FAIL_CODE = "collectionSaveFailed";

function setup() {
  const onSuccess = vi.fn();
  const view = renderHook(() => useSubmitDialog());
  const start = (action: () => Promise<OperationResult<unknown>>) =>
    act(async () =>
      view.result.current.run(action, { onSuccess, failCode: FAIL_CODE }),
    );
  return { onSuccess, start, ...view };
}

describe("useSubmitDialog", () => {
  it("is pending until the answer, then succeeds once for the close handler", async () => {
    const answer = Promise.withResolvers<OperationResult>();
    const { result, start, onSuccess } = setup();

    await start(() => answer.promise);
    expect(result.current.isPending).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () =>
      answer.resolve({ success: true, data: null, error: null }),
    );

    expect(result.current.isPending).toBe(false);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(result.current.takeDone()).toBe(true);
    expect(result.current.takeDone()).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the words of the server's code for a refused result, and is not done", async () => {
    const { result, start, onSuccess } = setup();

    await start(async () => ({
      success: false,
      data: null,
      error: "collectionNotFound",
    }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "This collection no longer exists.",
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.takeDone()).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it("lets Next look at a thrown error first, then shows its own message", async () => {
    const failure = new Error("network");
    const { result, start, onSuccess } = setup();

    await start(async () => {
      throw failure;
    });

    expect(rethrow).toHaveBeenCalledExactlyOnceWith(failure);
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Couldn't update the collection",
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.takeDone()).toBe(false);
  });
});
