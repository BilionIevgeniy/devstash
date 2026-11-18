import { act, render, screen, waitFor } from "../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CustomTypeRow } from "@/features/item-types/types";
import type { ActionResult } from "@/lib/errors/action-result";

const { createCustomType, updateCustomType, deleteCustomType, toast } =
  vi.hoisted(() => ({
    createCustomType: vi.fn(),
    updateCustomType: vi.fn(),
    deleteCustomType: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn() },
  }));
vi.mock("@/features/item-types/actions/custom-type", () => ({
  createCustomType,
  updateCustomType,
  deleteCustomType,
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { CustomTypesSection } from "@/features/item-types/components/CustomTypesSection";

const RECIPES: CustomTypeRow = {
  id: "t1",
  name: "Recipes",
  slug: "recipes",
  icon: "Code",
  color: "#3b82f6",
  itemCount: 0,
};
const SAVED: ActionResult = { success: true, data: null, error: null };

describe("CustomTypesSection", () => {
  it("creates a type with the chosen icon and color, then syncs and confirms", async () => {
    const answer = Promise.withResolvers<ActionResult>();
    createCustomType.mockReturnValue(answer.promise);
    const sync = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CustomTypesSection types={[]} isPro sync={sync} />);

    await user.click(screen.getByRole("button", { name: "New type" }));
    await user.type(screen.getByLabelText("Name"), "Recipes");
    await user.click(screen.getByRole("radio", { name: "Terminal" }));
    await user.click(screen.getByRole("radio", { name: "Red" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    await act(async () => answer.resolve(SAVED));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(createCustomType).toHaveBeenCalledWith({
      name: "Recipes",
      icon: "Terminal",
      color: "#ef4444",
    });
    expect(sync).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Type created");
  });

  it("keeps the dialog and the input open when the save is refused", async () => {
    createCustomType.mockResolvedValue({
      success: false,
      data: null,
      error: "typeNameTaken",
    });
    const user = userEvent.setup();
    render(<CustomTypesSection types={[RECIPES]} isPro />);

    await user.click(screen.getByRole("button", { name: "New type" }));
    await user.type(screen.getByLabelText("Name"), "recipes");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You already have a type with this name",
      ),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("recipes");
  });

  it("does not offer a delete of a type that still has items", async () => {
    const user = userEvent.setup();
    render(<CustomTypesSection types={[{ ...RECIPES, itemCount: 2 }]} isPro />);

    await user.click(screen.getByRole("button", { name: "Delete Recipes" }));
    expect(screen.getByText(/still has 2 items/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("lets a former Pro user delete but not create or edit", () => {
    render(<CustomTypesSection types={[RECIPES]} isPro={false} />);

    expect(
      screen.getByRole("button", { name: "Delete Recipes" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit Recipes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "New type" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Free user with no types the way to upgrade", () => {
    render(<CustomTypesSection types={[]} isPro={false} />);

    expect(
      screen.getByRole("link", { name: "Upgrade to Pro" }),
    ).toHaveAttribute("href", "/upgrade");
  });
});
