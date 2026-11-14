import { act, render, screen } from "../../../../test/intl";
import { describe, expect, it, vi } from "vitest";

// Its own file: the form's chunk is loaded once per module graph, so a load
// the test holds open can only be staged before any other test has loaded it.
const { gates } = vi.hoisted(() => ({
  gates: [] as PromiseWithResolvers<void>[],
}));

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
// Each load of the chunk waits until the test settles it.
vi.mock(
  "@/features/items/_internal/components/CreateItemForm",
  async (importActual) => {
    const gate = Promise.withResolvers<void>();
    gates.push(gate);
    await gate.promise;
    return importActual();
  },
);

import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

function dialog(open: boolean) {
  return (
    <CreateItemDialog
      isPro={false}
      controlled={{ open, onOpenChange: () => {}, returnFocus: () => {} }}
    />
  );
}

describe("CreateItemDialog, when a load fails after its dialog closed", () => {
  it("does not greet the next open with the old failure", async () => {
    const { rerender } = render(dialog(true));
    await vi.waitFor(() => expect(gates).toHaveLength(1));

    rerender(dialog(false));
    await act(async () => gates[0].reject(new Error("Failed to fetch chunk")));
    rerender(dialog(true));

    await vi.waitFor(() => expect(gates).toHaveLength(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Loading the form…")).toBeInTheDocument();

    await act(async () => gates[1].resolve());
    expect(
      await screen.findByRole("combobox", { name: "Type" }),
    ).toBeInTheDocument();
  });
});
