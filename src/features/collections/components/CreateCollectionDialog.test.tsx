import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/action-result";

import { CatchBoundary } from "../../../../test/catch-boundary";

const { createCollection, toast, rethrow } = vi.hoisted(() => ({
  createCollection: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  rethrow: vi.fn(),
}));
vi.mock("@/features/collections/actions/collection", () => ({
  createCollection,
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));
vi.mock("sonner", () => ({ toast }));

import { CreateCollectionDialog } from "@/features/collections/components/CreateCollectionDialog";

const CREATED: ActionResult = { success: true, data: null, error: null };

async function openAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New collection" }));
  await user.type(screen.getByLabelText("Name"), "React");
  await user.click(screen.getByRole("button", { name: "Create" }));
}

// The behaviour the shared dialog hook must keep (characterization).
describe("CreateCollectionDialog", () => {
  it("closes on success and only then confirms with a toast", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    createCollection.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    render(<CreateCollectionDialog />);

    await openAndSubmit(user);
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => answer.resolve(CREATED));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Collection created");
    expect(createCollection).toHaveBeenCalledWith({
      name: "React",
      description: "",
    });
  });

  it("cannot be closed with Esc while the request runs", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    createCollection.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    render(<CreateCollectionDialog />);

    await openAndSubmit(user);
    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    // React holds later transitions behind one that never ends: settle it,
    // with a failure, so no close and no toast run into the next test.
    await act(async () =>
      answer.resolve({ success: false, data: null, error: "generic" }),
    );
  });

  it("keeps the form and the input open on a failure, with the error", async () => {
    createCollection.mockResolvedValue({
      success: false,
      data: null,
      error: "collectionLimitReached",
      params: { limit: 3 },
    });
    const user = userEvent.setup();
    render(<CreateCollectionDialog />);

    await openAndSubmit(user);

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "You have reached the Free plan's limit of 3 collections. Upgrade to Pro for unlimited collections.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("React");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("lets a sign-in redirect go on, with no error toast", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    createCollection.mockRejectedValue(redirect);
    rethrow.mockImplementation((error: unknown) => {
      if (error === redirect) throw error;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <CatchBoundary>
        <CreateCollectionDialog />
      </CatchBoundary>,
    );

    await openAndSubmit(user);

    expect(
      await screen.findByText("Caught: NEXT_REDIRECT"),
    ).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
