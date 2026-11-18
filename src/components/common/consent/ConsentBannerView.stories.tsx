import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ConsentBannerView } from "./ConsentBannerView";

// The view takes its state as props, so a story never reads or writes the
// stored answer, which would carry over to the next story in the same browser.
const meta = {
  component: ConsentBannerView,
  args: {
    current: null,
    takeFocus: false,
    onAccept: fn(),
    onDecline: fn(),
  },
} satisfies Meta<typeof ConsentBannerView>;

export default meta;
type Story = StoryObj<typeof meta>;

// A fresh visitor: the two answers side by side, the same kind of button.
export const FirstVisit: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Allow" }));
    await expect(args.onAccept).toHaveBeenCalledOnce();
  },
};

// Opened again from Privacy settings: it says the current answer and takes
// the focus.
export const Reopened: Story = {
  args: { current: "granted", takeFocus: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Currently allowed\./)).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Performance measurement" }),
    ).toHaveFocus();
  },
};
