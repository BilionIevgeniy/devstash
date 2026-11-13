import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { CollectionSummary } from "@/features/collections/types";
import type { ActionResult } from "@/lib/action-result";

import { CatchBoundary } from "../../../../../test/catch-boundary";

const { updateCollection, toast, rethrow } = vi.hoisted(() => ({
  updateCollection: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  rethrow: vi.fn(),
}));
vi.mock("@/features/collections/actions/collection", () => ({
  updateCollection,
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));
vi.mock("sonner", () => ({ toast }));

import { EditCollectionDialog } from "@/features/collections/_internal/components/EditCollectionDialog";

const COLLECTION: CollectionSummary = {
  id: "col-1",
  name: "React",
  description: null,
  isFavorite: false,
};
const SAVED: ActionResult = { success: true, data: null, error: null };

// Controlled from outside, as the card menu and the page header do.
function Harness({ returnFocus }: { returnFocus: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <EditCollectionDialog
      collection={COLLECTION}
      open={open}
      onOpenChange={setOpen}
      returnFocus={returnFocus}
    />
  );
}

async function rename(user: ReturnType<typeof userEvent.setup>) {
  const name = screen.getByLabelText("Name");
  await user.clear(name);
  await user.type(name, "React patterns");
  await user.click(screen.getByRole("button", { name: "Save" }));
}

// The behaviour the shared dialog hook must keep (characterization).
describe("EditCollectionDialog", () => {
  it("closes on success, hands the focus back, and only then confirms", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    updateCollection.mockReturnValue(answer.promise);
    const returnFocus = vi.fn();
    const user = userEvent.setup();
    render(<Harness returnFocus={returnFocus} />);

    await rename(user);
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => answer.resolve(SAVED));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Collection updated");
    expect(returnFocus).toHaveBeenCalled();
    expect(updateCollection).toHaveBeenCalledWith("col-1", {
      name: "React patterns",
      description: "",
    });
  });

  it("cannot be closed with Esc while the request runs", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    updateCollection.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    render(<Harness returnFocus={vi.fn()} />);

    await rename(user);
    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    // React holds later transitions behind one that never ends: settle it,
    // with a failure, so no close and no toast run into the next test.
    await act(async () =>
      answer.resolve({ success: false, data: null, error: "generic" }),
    );
  });

  it("keeps the form and the input open on a failure, with the error", async () => {
    updateCollection.mockResolvedValue({
      success: false,
      data: null,
      error: "collectionNotFound",
    });
    const user = userEvent.setup();
    render(<Harness returnFocus={vi.fn()} />);

    await rename(user);

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "This collection no longer exists.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("React patterns");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("lets a sign-in redirect go on, with no error toast", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    updateCollection.mockRejectedValue(redirect);
    rethrow.mockImplementation((error: unknown) => {
      if (error === redirect) throw error;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <CatchBoundary>
        <Harness returnFocus={vi.fn()} />
      </CatchBoundary>,
    );

    await rename(user);

    expect(
      await screen.findByText("Caught: NEXT_REDIRECT"),
    ).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
