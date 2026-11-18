import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../test/intl";

const useHasSession = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/components/hooks/use-has-session", () => ({
  useHasSession,
}));

import { SessionAwareAction } from "./SessionAwareAction";

function renderAction() {
  render(
    <SessionAwareAction
      guest={(hidden) => (
        <a href="/register" data-hidden={hidden}>
          Get Started
        </a>
      )}
      member={(hidden) => (
        <a href="/dashboard" data-hidden={hidden}>
          Open Dashboard
        </a>
      )}
    />,
  );
}

// `invisible` leaves the accessibility tree, which jsdom cannot compute from a
// class: the test reads the class of each variant's cell.
const cellOf = (name: string) =>
  screen.getByRole("link", { name, hidden: true }).parentElement;

describe("SessionAwareAction", () => {
  it("keeps both variants unseen until the session is known", () => {
    useHasSession.mockReturnValue(null);
    renderAction();

    expect(cellOf("Get Started")).toHaveClass("invisible");
    expect(cellOf("Open Dashboard")).toHaveClass("invisible");
  });

  it("shows a guest the guest's link only", () => {
    useHasSession.mockReturnValue(false);
    renderAction();

    expect(cellOf("Get Started")).not.toHaveClass("invisible");
    expect(cellOf("Open Dashboard")).toHaveClass("invisible");
    // The hidden variant is told, so its link is not prefetched.
    expect(
      screen.getByRole("link", { name: "Open Dashboard", hidden: true }),
    ).toHaveAttribute("data-hidden", "true");
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "data-hidden",
      "false",
    );
  });

  it("shows a signed-in visitor the member's link only", () => {
    useHasSession.mockReturnValue(true);
    renderAction();

    expect(cellOf("Get Started")).toHaveClass("invisible");
    expect(cellOf("Open Dashboard")).not.toHaveClass("invisible");
  });
});
