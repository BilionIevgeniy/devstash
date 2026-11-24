import { describe, expect, it, vi } from "vitest";

import { act, renderHook } from "../../../../../../test/intl";
import {
  usePromptAccept,
  type AcceptPrompt,
} from "@/features/ai/_internal/components/hooks/use-prompt-accept";

function setup(onAccept: AcceptPrompt) {
  const reset = vi.fn();
  const view = renderHook(() => usePromptAccept(onAccept, reset));
  const button = document.createElement("button");
  document.body.append(button);
  view.result.current.buttonRef.current = button;
  return { reset, button, ...view };
}

describe("usePromptAccept", () => {
  it("is saving until the save answers, then shows the saved prompt and resets", async () => {
    const save = Promise.withResolvers<() => void>();
    const showSaved = vi.fn();
    const { result, reset, button } = setup(() => save.promise);

    act(() => result.current.accept("better"));
    expect(result.current.isSaving).toBe(true);
    expect(reset).not.toHaveBeenCalled();

    await act(async () => save.resolve(showSaved));
    expect(result.current.isSaving).toBe(false);
    expect(showSaved).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
    // The bar that had the focus is gone.
    expect(button).toHaveFocus();
  });

  it("keeps the answer when the save failed", async () => {
    const { result, reset, button } = setup(async () => null);

    await act(async () => result.current.accept("better"));

    expect(result.current.isSaving).toBe(false);
    expect(reset).not.toHaveBeenCalled();
    expect(button).not.toHaveFocus();
  });

  it("goes back to the original with the focus on the button", () => {
    const { result, reset, button } = setup(async () => null);

    act(() => result.current.backToOriginal());

    expect(reset).toHaveBeenCalledOnce();
    expect(button).toHaveFocus();
  });
});
