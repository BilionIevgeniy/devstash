import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ThemePickerView } from "./ThemePickerView";

// The view takes the choice as props: the picker's own store would read and
// write the browser's storage, which carries over to the next story.
const meta = {
  component: ThemePickerView,
  args: {
    theme: "dark",
    onChange: fn(),
    legendClassName: "mb-2 text-sm font-medium",
  },
} satisfies Meta<typeof ThemePickerView>;

export default meta;
type Story = StoryObj<typeof meta>;

// The stored choice is checked; another one is passed up.
export const Known: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("group", { name: "Appearance" });
    await expect(
      within(group).getByRole("radio", { name: "Dark" }),
    ).toBeChecked();
    await userEvent.click(canvas.getByText("Light"));
    await expect(args.onChange).toHaveBeenCalledWith("light");
  },
};

// Before hydration is over: the same boxes, no control, nothing announced.
export const Unknown: Story = {
  args: { theme: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("radio")).toBeNull();
    await expect(canvas.queryByRole("group")).toBeNull();
  },
};
