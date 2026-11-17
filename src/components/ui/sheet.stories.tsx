import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function ExampleSheet({
  side = "right",
}: {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Collections</SheetTitle>
          <SheetDescription>Browse your collections.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

const meta = {
  component: ExampleSheet,
  argTypes: {
    side: { control: "select", options: ["top", "right", "bottom", "left"] },
  },
} satisfies Meta<typeof ExampleSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

// "Keyboard and focus" of coding-standards.md: the sheet has a title, Esc
// closes it, and the focus goes back to the trigger.
export const EscReturnsFocus: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Open sheet",
    });
    await userEvent.click(trigger);

    const dialog = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog",
      { name: "Collections" },
    );
    // It fades in, from opacity 0.
    await waitFor(() => expect(dialog).toBeVisible());

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};
