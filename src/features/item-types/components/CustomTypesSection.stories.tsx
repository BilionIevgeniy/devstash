import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";

import { createCustomType } from "@/features/item-types/actions/custom-type";
import { CustomTypesSection } from "@/features/item-types/components/CustomTypesSection";
import type { CustomTypeRow } from "@/features/item-types/types";
import { fail } from "@/lib/errors/action-result";

// The actions are the mocks of actions/__mocks__/custom-type.ts (sb.mock in
// .storybook/preview.tsx), so nothing is sent anywhere.
const TYPES: CustomTypeRow[] = [
  {
    id: "type-recipes",
    name: "Recipes",
    slug: "recipes",
    icon: "StickyNote",
    color: "#ef4444",
    itemCount: 3,
  },
  {
    id: "type-sql",
    name: "SQL queries",
    slug: "sql-queries",
    icon: "Terminal",
    color: "#06b6d4",
    itemCount: 0,
  },
];

const meta = {
  title: "Item types/CustomTypesSection",
  component: CustomTypesSection,
  args: { types: TYPES, isPro: true },
} satisfies Meta<typeof CustomTypesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pro: Story = {};

export const ProEmpty: Story = { args: { types: [] } };

// A Free user with no types: the upgrade, no create.
export const FreeLocked: Story = { args: { types: [], isPro: false } };

// A former Pro user keeps the types and can delete them, nothing else.
export const FormerPro: Story = { args: { isPro: false } };

// The whole palette and icon set on screen, so the axe check sees every
// choice in the open dialog.
export const CreateDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "New type" }));
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole("dialog")).toHaveAttribute("data-state", "open"),
    );
    await expect(body.getAllByRole("radio")).toHaveLength(19);
  },
};

export const RefusedSave: Story = {
  beforeEach: () => {
    mocked(createCustomType).mockResolvedValue(fail("typeNameTaken"));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "New type" }));
    const body = within(canvasElement.ownerDocument.body);
    const name = await body.findByLabelText("Name");
    await userEvent.type(name, "recipes");
    await userEvent.click(body.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(createCustomType).toHaveBeenCalled());
    await expect(name).toHaveValue("recipes");
  },
};

export const DeleteWithItems: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete Recipes" }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole("alertdialog")).toHaveAttribute(
        "data-state",
        "open",
      ),
    );
    await expect(body.getByText(/still has 3 items/)).toBeInTheDocument();
  },
};
