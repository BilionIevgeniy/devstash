import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { OperationResult } from "@/lib/action-result";

const { toast, rethrow } = vi.hoisted(() => ({
  toast: { error: vi.fn() },
  rethrow: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));

import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";

const FAIL_MESSAGE = "Couldn't save";

function setup() {
  const onSuccess = vi.fn();
  const view = renderHook(() => useSubmitDialog());
  const start = (action: () => Promise<OperationResult<unknown>>) =>
    act(async () =>
      view.result.current.run(action, { onSuccess, failMessage: FAIL_MESSAGE }),
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

  it("shows the server's words for a refused result, and is not done", async () => {
    const { result, start, onSuccess } = setup();

    await start(async () => ({
      success: false,
      data: null,
      error: "Collection not found",
    }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith("Collection not found");
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
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(FAIL_MESSAGE);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.takeDone()).toBe(false);
  });
});
