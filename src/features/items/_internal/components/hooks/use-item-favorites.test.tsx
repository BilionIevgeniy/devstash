import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/action-result";

const setItemFavorite = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("@/features/items/actions/item", () => ({ setItemFavorite }));
vi.mock("sonner", () => ({ toast }));

import { useItemFavorites } from "@/features/items/_internal/components/hooks/use-item-favorites";

const SAVED: ActionResult = { success: true, data: null, error: null };
const GENERIC_ERROR = "Couldn't update the favorite.";

function setup() {
  const onSaved = vi.fn();
  const view = renderHook(() => useItemFavorites(onSaved));
  return { onSaved, ...view };
}

describe("useItemFavorites", () => {
  it("shows the new star while the action runs, then hands the saved value on", async () => {
    const pending = Promise.withResolvers<ActionResult>();
    setItemFavorite.mockReturnValue(pending.promise);
    const { result, onSaved } = setup();

    await act(async () => result.current.toggleFavorite("item-1", true));

    expect(setItemFavorite).toHaveBeenCalledExactlyOnceWith("item-1", true);
    expect(result.current.favoriteOverrides.get("item-1")).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();

    await act(async () => pending.resolve(SAVED));

    expect(onSaved).toHaveBeenCalledExactlyOnceWith("item-1", true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("takes the star back and shows the server's error when the action fails", async () => {
    const pending = Promise.withResolvers<ActionResult>();
    setItemFavorite.mockReturnValue(pending.promise);
    const { result, onSaved } = setup();
    await act(async () => result.current.toggleFavorite("item-1", true));
    expect(result.current.favoriteOverrides.get("item-1")).toBe(true);

    await act(async () =>
      pending.resolve({
        success: false,
        data: null,
        error: "Favorites need a Pro plan.",
      }),
    );

    expect(result.current.favoriteOverrides.has("item-1")).toBe(false);
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Favorites need a Pro plan.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a failed result with no message",
      () =>
        setItemFavorite.mockResolvedValue({
          success: false,
          data: null,
          error: null,
        }),
    ],
    [
      "a rejected action",
      () => setItemFavorite.mockRejectedValue(new Error("offline")),
    ],
  ])(
    "takes the star back with a plain message after %s",
    async (_name, arrange) => {
      arrange();
      const { result, onSaved } = setup();

      await act(async () => result.current.toggleFavorite("item-1", true));

      expect(result.current.favoriteOverrides.has("item-1")).toBe(false);
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(GENERIC_ERROR);
      expect(onSaved).not.toHaveBeenCalled();
    },
  );

  it("offers Undo after an undoable unfavorite, and Undo stars the item again", async () => {
    setItemFavorite.mockResolvedValue(SAVED);
    const { result } = setup();

    await act(async () =>
      result.current.toggleFavorite("item-1", false, { undoable: true }),
    );

    expect(toast).toHaveBeenCalledExactlyOnceWith(
      "Removed from favorites",
      expect.objectContaining({
        action: expect.objectContaining({ label: "Undo" }),
      }),
    );
    const { action } = toast.mock.calls[0][1];
    await act(async () => action.onClick());
    expect(setItemFavorite).toHaveBeenLastCalledWith("item-1", true);
  });

  it.each([
    ["an unfavorite the caller did not mark undoable", false, undefined],
    ["a favorite, even when marked undoable", true, { undoable: true }],
  ])("shows no Undo toast after %s", async (_name, isFavorite, options) => {
    setItemFavorite.mockResolvedValue(SAVED);
    const { result } = setup();

    await act(async () =>
      result.current.toggleFavorite("item-1", isFavorite, options),
    );

    expect(toast).not.toHaveBeenCalled();
  });
});
