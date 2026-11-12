import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useUnsavedChanges } from "@/features/items/_internal/components/hooks/use-unsaved-changes";

function beforeUnload(): BeforeUnloadEvent {
  const event = new Event("beforeunload", {
    cancelable: true,
  }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event;
}

describe("useUnsavedChanges", () => {
  it("tells the owner the form state, and false when the form goes away", () => {
    const onDirtyChange = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ isChanged }) => useUnsavedChanges(isChanged, onDirtyChange),
      { initialProps: { isChanged: false } },
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    rerender({ isChanged: true });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("reports to the latest callback, and a new callback alone reports nothing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ onDirtyChange }) => useUnsavedChanges(true, onDirtyChange),
      { initialProps: { onDirtyChange: first } },
    );
    first.mockClear();

    rerender({ onDirtyChange: second });

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    unmount();
    expect(second).toHaveBeenCalledExactlyOnceWith(false);
    expect(first).not.toHaveBeenCalled();
  });

  it("works with no owner to tell", () => {
    expect(() =>
      renderHook(() => useUnsavedChanges(true)).unmount(),
    ).not.toThrow();
  });

  it("warns before a reload only while the form holds edits", () => {
    const { rerender } = renderHook(
      ({ isChanged }) => useUnsavedChanges(isChanged),
      { initialProps: { isChanged: false } },
    );
    expect(beforeUnload().defaultPrevented).toBe(false);

    rerender({ isChanged: true });
    expect(beforeUnload().defaultPrevented).toBe(true);

    rerender({ isChanged: false });
    expect(beforeUnload().defaultPrevented).toBe(false);
  });
});
