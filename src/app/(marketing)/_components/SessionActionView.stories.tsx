import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@/components/ui/button";

import { SessionActionView } from "./SessionActionView";

const meta = {
  component: SessionActionView,
  args: {
    guest: () => (
      <Button asChild size="lg">
        <a href="/register">Get Started</a>
      </Button>
    ),
    member: () => (
      <Button asChild size="lg">
        <a href="/dashboard">Open Dashboard</a>
      </Button>
    ),
  },
} satisfies Meta<typeof SessionActionView>;

export default meta;
type Story = StoryObj<typeof meta>;

// The spinner never ends, so nothing here waits for the animations.
export const Pending: Story = {
  args: { hasSession: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("link")).toBeNull();

    // As large as the wider of the two buttons it stands for.
    const box = (element: Element | null | undefined) =>
      element?.getBoundingClientRect();
    const placeholder = canvasElement.querySelector('[aria-hidden="true"]');
    const wider = canvas.getByText("Open Dashboard");
    await expect(box(placeholder)?.width).toBe(box(wider)?.width);
    await expect(box(placeholder)?.height).toBe(box(wider)?.height);
  },
};

export const PendingOutline: Story = {
  args: { hasSession: null, pendingVariant: "outline" },
};

export const Guest: Story = {
  args: { hasSession: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Get Started" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Open Dashboard" })).toBe(
      null,
    );
  },
};

export const SignedIn: Story = {
  args: { hasSession: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("link", { name: "Open Dashboard" }),
    ).toBeVisible();
  },
};
