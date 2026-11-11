import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDirtyCloseGuard } from "@/features/items/_internal/components/hooks/use-dirty-close-guard";

function setup() {
  const onOpenChange = vi.fn();
  const view = renderHook(() => useDirtyCloseGuard(onOpenChange));
  return { onOpenChange, ...view };
}

describe("useDirtyCloseGuard", () => {
  it("closes at once when the form holds no unsaved edits", () => {
    const { result, onOpenChange } = setup();

    act(() => result.current.guardOpenChange(false));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(result.current.discardDialogProps.open).toBe(false);
  });

  it("asks first and keeps the sheet open when the form is dirty", () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.setDirty(true));

    act(() => result.current.guardOpenChange(false));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(result.current.discardDialogProps.open).toBe(true);
  });

  it("never blocks opening, even over a dirty form", () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.setDirty(true));

    act(() => result.current.guardOpenChange(true));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(result.current.discardDialogProps.open).toBe(false);
  });

  it("closes on Discard and no longer treats the form as dirty", () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.setDirty(true));
    act(() => result.current.guardOpenChange(false));

    act(() => result.current.discardDialogProps.onDiscard());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    onOpenChange.mockClear();
    act(() => result.current.guardOpenChange(false));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("keeps the sheet open when the user chooses to keep editing", () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.setDirty(true));
    act(() => result.current.guardOpenChange(false));

    act(() => result.current.discardDialogProps.onOpenChange(false));

    expect(result.current.discardDialogProps.open).toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();

    // The edits are still unsaved, so the next close asks again.
    act(() => result.current.guardOpenChange(false));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(result.current.discardDialogProps.open).toBe(true);
  });
});
