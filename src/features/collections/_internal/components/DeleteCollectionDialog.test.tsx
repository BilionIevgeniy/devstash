import { act, render, screen, waitFor } from "../../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { CollectionSummary } from "@/features/collections/types";
import type { ActionResult } from "@/lib/action-result";

import { CatchBoundary } from "../../../../../test/catch-boundary";

const { deleteCollection, toast, rethrow, router } = vi.hoisted(() => ({
  deleteCollection: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  rethrow: vi.fn(),
  router: { replace: vi.fn(), refresh: vi.fn() },
}));
vi.mock("@/features/collections/actions/collection", () => ({
  deleteCollection,
}));
vi.mock("next/navigation", () => ({
  unstable_rethrow: rethrow,
  useRouter: () => router,
}));
vi.mock("sonner", () => ({ toast }));

import { DeleteCollectionDialog } from "@/features/collections/_internal/components/DeleteCollectionDialog";

const COLLECTION: CollectionSummary = {
  id: "col-1",
  name: "React",
  description: null,
  isFavorite: false,
};
const DELETED: ActionResult = { success: true, data: null, error: null };

// Controlled from outside, as the card menu and the page header do.
function Harness({
  leaveTo,
  returnFocus = () => undefined,
}: {
  leaveTo?: string;
  returnFocus?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <DeleteCollectionDialog
      collection={COLLECTION}
      leaveTo={leaveTo}
      open={open}
      onOpenChange={setOpen}
      returnFocus={returnFocus}
    />
  );
}

async function confirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Delete" }));
}

// The behaviour the shared dialog hook must keep (characterization).
describe("DeleteCollectionDialog", () => {
  it("closes on success, hands the focus back, and only then confirms", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    deleteCollection.mockReturnValue(answer.promise);
    const returnFocus = vi.fn();
    const user = userEvent.setup();
    render(<Harness returnFocus={returnFocus} />);

    await confirm(user);
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => answer.resolve(DELETED));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Collection deleted");
    expect(returnFocus).toHaveBeenCalled();
    expect(deleteCollection).toHaveBeenCalledWith("col-1", { refresh: true });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("leaves the collection's own page with a replace, not a refresh of it", async () => {
    deleteCollection.mockResolvedValue(DELETED);
    const user = userEvent.setup();
    render(<Harness leaveTo="/collections" />);

    await confirm(user);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/collections"),
    );
    expect(router.refresh).toHaveBeenCalled();
    expect(deleteCollection).toHaveBeenCalledWith("col-1", { refresh: false });
  });

  it("cannot be closed with Esc while the request runs", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    deleteCollection.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    render(<Harness />);

    await confirm(user);
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
    deleteCollection.mockResolvedValue({
      success: false,
      data: null,
      error: "collectionNotFound",
    });
    const user = userEvent.setup();
    render(<Harness />);

    await confirm(user);

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "This collection no longer exists.",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("lets a sign-in redirect go on, with no error toast", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    deleteCollection.mockRejectedValue(redirect);
    rethrow.mockImplementation((error: unknown) => {
      if (error === redirect) throw error;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <CatchBoundary>
        <Harness />
      </CatchBoundary>,
    );

    await confirm(user);

    expect(
      await screen.findByText("Caught: NEXT_REDIRECT"),
    ).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
