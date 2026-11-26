import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../../test/intl";

const useLinkStatus = vi.hoisted(() => vi.fn());
vi.mock("next/link", () => ({ useLinkStatus }));

import { PendingLinkLabel } from "./PendingLinkLabel";

function renderLink() {
  return render(
    <a href="/dashboard">
      <PendingLinkLabel>Open Dashboard</PendingLinkLabel>
    </a>,
  );
}

const spinner = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]');

describe("PendingLinkLabel", () => {
  beforeEach(() => {
    useLinkStatus.mockReturnValue({ pending: false });
  });

  it("is only the label while nothing is loading", () => {
    const { container } = renderLink();

    expect(screen.getByRole("link")).toHaveAccessibleName("Open Dashboard");
    expect(spinner(container)).toBeNull();
    expect(screen.getByText("Open Dashboard")).not.toHaveClass("opacity-0");
  });

  it("shows a spinner in the label's place, and the link keeps its name", () => {
    useLinkStatus.mockReturnValue({ pending: true });
    const { container } = renderLink();

    expect(screen.getByRole("link")).toHaveAccessibleName("Open Dashboard");
    expect(spinner(container)).toBeInTheDocument();
    // Faded, not removed: it holds the button's size and is its name.
    expect(screen.getByText("Open Dashboard")).toHaveClass("opacity-0");
  });
});
