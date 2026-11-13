import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/action-result";

import { CatchBoundary } from "../../../../../test/catch-boundary";

const { deleteItem, toast, rethrow } = vi.hoisted(() => ({
  deleteItem: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  rethrow: vi.fn(),
}));
vi.mock("@/features/items/actions/item", () => ({ deleteItem }));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));
vi.mock("sonner", () => ({ toast }));

import { DeleteLockedItemButton } from "@/features/items/_internal/components/DeleteLockedItemButton";

const DELETED: ActionResult = { success: true, data: null, error: null };

async function openAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Delete Diagram" }));
  await user.click(screen.getByRole("button", { name: "Delete" }));
}

function renderButton(returnFocus = vi.fn()) {
  render(
    <DeleteLockedItemButton
      itemId="item-1"
      title="Diagram"
      returnFocus={returnFocus}
    />,
  );
  return returnFocus;
}

// The behaviour the shared dialog hook must keep (characterization).
describe("DeleteLockedItemButton", () => {
  it("closes on success, hands the focus on, and only then confirms", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    deleteItem.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    const returnFocus = renderButton();

    await openAndConfirm(user);
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => answer.resolve(DELETED));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Item deleted");
    expect(returnFocus).toHaveBeenCalled();
    expect(deleteItem).toHaveBeenCalledWith("item-1");
  });

  it("leaves the focus to Radix on Cancel", async () => {
    const user = userEvent.setup();
    const returnFocus = renderButton();

    await user.click(screen.getByRole("button", { name: "Delete Diagram" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(returnFocus).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Delete Diagram" }),
    ).toHaveFocus();
  });

  it("cannot be closed with Esc while the request runs", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    deleteItem.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    renderButton();

    await openAndConfirm(user);
    await user.keyboard("{Escape}");

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    // React holds later transitions behind one that never ends: settle it,
    // with a failure, so no close and no toast run into the next test.
    await act(async () =>
      answer.resolve({ success: false, data: null, error: "generic" }),
    );
  });

  it("stays open on a failure, with the error", async () => {
    deleteItem.mockResolvedValue({
      success: false,
      data: null,
      error: "itemNotFound",
    });
    const user = userEvent.setup();
    renderButton();

    await openAndConfirm(user);

    expect(toast.error).toHaveBeenCalledExactlyOnceWith("Item not found");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("lets a sign-in redirect go on, with no error toast", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    deleteItem.mockRejectedValue(redirect);
    rethrow.mockImplementation((error: unknown) => {
      if (error === redirect) throw error;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <CatchBoundary>
        <DeleteLockedItemButton
          itemId="item-1"
          title="Diagram"
          returnFocus={vi.fn()}
        />
      </CatchBoundary>,
    );

    await openAndConfirm(user);

    expect(
      await screen.findByText("Caught: NEXT_REDIRECT"),
    ).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
