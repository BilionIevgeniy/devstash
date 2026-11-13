import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ItemFields } from "@/features/items/_internal/components/ItemFields";
import type { ActionResult } from "@/lib/action-result";

import { CatchBoundary } from "../../../../test/catch-boundary";

const { createItem, toast, rethrow } = vi.hoisted(() => ({
  createItem: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  rethrow: vi.fn(),
}));
vi.mock("@/features/items/actions/item", () => ({ createItem }));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));
vi.mock("sonner", () => ({ toast }));
// The real fields pull in the editors. The probe keeps only the title, which
// is all a snippet needs to be sent.
vi.mock("@/features/items/_internal/components/ItemFields", () => ({
  ItemFields: ({ values, onChange }: ComponentProps<typeof ItemFields>) => (
    <label>
      Title
      <input
        value={values.title}
        onChange={(event) => onChange("title", event.target.value)}
      />
    </label>
  ),
}));
// The real select fetches the user's collections, and the file field loads
// the upload action and its session chain; a snippet has no file.
vi.mock("@/features/items/_internal/components/CollectionSelect", () => ({
  CollectionSelect: () => null,
}));
vi.mock("@/features/items/_internal/components/ItemFileField", () => ({
  ItemFileField: () => null,
}));

import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

const CREATED: ActionResult = { success: true, data: null, error: null };

async function openAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New snippet" }));
  await user.type(screen.getByLabelText("Title"), "ls -la");
  await user.click(screen.getByRole("button", { name: "Create" }));
}

function renderDialog() {
  render(<CreateItemDialog defaultType="snippet" isPro={false} />);
}

// The behaviour the shared dialog hook must keep (characterization).
describe("CreateItemDialog", () => {
  it("closes on success and only then confirms with a toast", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    createItem.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    renderDialog();

    await openAndSubmit(user);
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => answer.resolve(CREATED));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Item created");
    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({ typeName: "snippet", title: "ls -la" }),
    );
  });

  it("cannot be closed with Esc while the request runs", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    createItem.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    renderDialog();

    await openAndSubmit(user);
    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    // React holds later transitions behind one that never ends: settle it,
    // with a failure, so no close and no toast run into the next test.
    await act(async () =>
      answer.resolve({ success: false, data: null, error: "stop" }),
    );
  });

  it("keeps the form and the input open on a failure, with the error", async () => {
    createItem.mockResolvedValue({
      success: false,
      data: null,
      error: "You have reached the Free plan's 50 items",
    });
    const user = userEvent.setup();
    renderDialog();

    await openAndSubmit(user);

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "You have reached the Free plan's 50 items",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("ls -la");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("lets a sign-in redirect go on, with no error toast", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    createItem.mockRejectedValue(redirect);
    rethrow.mockImplementation((error: unknown) => {
      if (error === redirect) throw error;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <CatchBoundary>
        <CreateItemDialog defaultType="snippet" isPro={false} />
      </CatchBoundary>,
    );

    await openAndSubmit(user);

    expect(
      await screen.findByText("Caught: NEXT_REDIRECT"),
    ).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
