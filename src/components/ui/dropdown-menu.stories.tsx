import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CardMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Collection actions">
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Star aria-hidden />
          Favorite
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil aria-hidden />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const meta = {
  component: CardMenu,
} satisfies Meta<typeof CardMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

// Opened by keyboard, as a user without a mouse would: the items are reachable
// and Esc closes the menu with the focus back on its trigger.
export const OpenByKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Collection actions",
    });
    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const menu = await within(canvasElement.ownerDocument.body).findByRole(
      "menu",
    );
    await expect(within(menu).getAllByRole("menuitem")).toHaveLength(3);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};
