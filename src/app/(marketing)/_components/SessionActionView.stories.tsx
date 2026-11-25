import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@/components/ui/button";

import { NavActionPlaceholder } from "./pending/NavActionPlaceholder";
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

// The navbar's layout: a guest gets a ghost "Sign In" and the main button, a
// signed-in visitor the main button alone. Its placeholder is that main
// button, at the right, in its look and as wide as the wider label, not a
// grey bar over both of the guest's buttons.
export const PendingNavbar: Story = {
  args: {
    hasSession: null,
    className: "w-96 items-center",
    cellClassName: "flex items-center gap-2 justify-self-end",
    guest: () => (
      <>
        <Button asChild variant="ghost" size="lg" className="px-3.5">
          <a href="/sign-in">Sign In</a>
        </Button>
        <Button asChild size="lg" className="px-3.5">
          <a href="/register">Get Started</a>
        </Button>
      </>
    ),
    member: () => (
      <Button asChild size="lg" className="px-3.5">
        <a href="/dashboard">Dashboard</a>
      </Button>
    ),
    pending: <NavActionPlaceholder labels={["Get Started", "Dashboard"]} />,
  },
  play: async ({ canvasElement }) => {
    const placeholder = canvasElement.querySelector('[aria-hidden="true"] > *');
    // Unseen until the answer, the links have no accessible name yet.
    const getStarted = canvasElement.querySelector('a[href="/register"]');
    const dashboard = canvasElement.querySelector('a[href="/dashboard"]');
    const box = (element: Element | null) => element?.getBoundingClientRect();

    // The wider of the two main buttons, at the same right edge.
    const wider = Math.max(
      box(getStarted)?.width ?? 0,
      box(dashboard)?.width ?? 0,
    );
    await expect(box(placeholder)?.width).toBe(wider);
    await expect(box(placeholder)?.height).toBe(box(getStarted)?.height);
    await expect(box(placeholder)?.right).toBe(box(getStarted)?.right);
    // The main button's colour, not the secondary grey.
    await expect(
      placeholder && getComputedStyle(placeholder).backgroundColor,
    ).toBe(getStarted && getComputedStyle(getStarted).backgroundColor);
  },
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
