import { render, screen } from "../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Its own file: the form's chunk is loaded once per module graph, so a failed
// first load can only be staged before any other test has loaded it.
const { chunk } = vi.hoisted(() => ({ chunk: { isReachable: false } }));

vi.mock("@/features/items/actions/item", () => ({ createItem: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/items/_internal/components/ItemFields", () => ({
  ItemFields: () => null,
}));
vi.mock("@/features/items/_internal/components/CollectionSelect", () => ({
  CollectionSelect: () => null,
}));
vi.mock("@/features/items/_internal/components/ItemFileField", () => ({
  ItemFileField: () => null,
}));
// Fails as a chunk fetch does after a deploy or offline, until the test lets
// it through; then the real form. The hover preload and the open both try.
vi.mock(
  "@/features/items/_internal/components/CreateItemForm",
  async (importActual) => {
    if (!chunk.isReachable) throw new Error("Failed to fetch chunk");
    return importActual();
  },
);

import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

describe("CreateItemDialog, when its form's chunk does not load", () => {
  it("shows the failure inside the dialog, and Try again brings the form with the focus on its first field", async () => {
    const user = userEvent.setup();
    render(<CreateItemDialog defaultType="snippet" isPro={false} />);

    await user.click(screen.getByRole("button", { name: "New Snippet" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The form couldn't load. Check your connection and try again.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    chunk.isReachable = true;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    const typeSelect = await screen.findByRole("combobox", { name: "Type" });
    expect(typeSelect).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
