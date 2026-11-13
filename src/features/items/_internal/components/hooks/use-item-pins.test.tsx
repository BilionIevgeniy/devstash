import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/action-result";

const setItemPin = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
);
vi.mock("@/features/items/actions/item", () => ({ setItemPin }));
vi.mock("sonner", () => ({ toast }));

import { useItemPins } from "@/features/items/_internal/components/hooks/use-item-pins";

const SAVED: ActionResult = { success: true, data: null, error: null };

function setup() {
  const onSaved = vi.fn();
  const view = renderHook(() => useItemPins(onSaved));
  return { onSaved, ...view };
}

// The toasts of a pin differ from the star's: both directions are confirmed.
// The shared rules (override, fallback, redirect) are in useItemFavorites'
// test, which runs through the same useOptimisticToggle.
describe("useItemPins", () => {
  it("confirms a pin and hands the saved value on", async () => {
    setItemPin.mockResolvedValue(SAVED);
    const { result, onSaved } = setup();

    await act(async () => result.current.togglePin("item-1", true));

    expect(setItemPin).toHaveBeenCalledExactlyOnceWith("item-1", true);
    expect(onSaved).toHaveBeenCalledExactlyOnceWith("item-1", true);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      "Item pinned",
      undefined,
    );
  });

  it("confirms an unpin without Undo when it was not marked undoable", async () => {
    setItemPin.mockResolvedValue(SAVED);
    const { result } = setup();

    await act(async () => result.current.togglePin("item-1", false));

    expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      "Item unpinned",
      undefined,
    );
  });

  it("offers Undo after an undoable unpin, and Undo pins the item again", async () => {
    setItemPin.mockResolvedValue(SAVED);
    const { result } = setup();

    await act(async () =>
      result.current.togglePin("item-1", false, { undoable: true }),
    );

    expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      "Item unpinned",
      expect.objectContaining({
        action: expect.objectContaining({ label: "Undo" }),
      }),
    );
    const { action } = toast.success.mock.calls[0][1];
    await act(async () => action.onClick());
    expect(setItemPin).toHaveBeenLastCalledWith("item-1", true);
  });

  it("takes the pin back with the server's words when it is refused", async () => {
    setItemPin.mockResolvedValue({
      success: false,
      data: null,
      error: "Item not found",
    });
    const { result, onSaved } = setup();

    await act(async () => result.current.togglePin("item-1", true));

    expect(result.current.pinOverrides.has("item-1")).toBe(false);
    expect(toast.error).toHaveBeenCalledExactlyOnceWith("Item not found");
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
