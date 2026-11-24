import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../test/intl";

const useHasSession = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/components/hooks/use-has-session", () => ({
  useHasSession,
}));

import { SessionAwareAction } from "./SessionAwareAction";

function renderAction() {
  return render(
    <SessionAwareAction
      pendingVariant="outline"
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

const placeholderOf = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]');

describe("SessionAwareAction", () => {
  it("stands in for both variants until the session is known", () => {
    useHasSession.mockReturnValue(null);
    const { container } = renderAction();

    expect(placeholderOf(container)).toBeInTheDocument();
    // They stay in the page, unseen: they hold the size.
    expect(cellOf("Get Started")).toHaveClass("invisible");
    expect(cellOf("Open Dashboard")).toHaveClass("invisible");
  });

  // A disabled link or an empty button would be a control with no name.
  it("offers nothing to the keyboard or a screen reader meanwhile", () => {
    useHasSession.mockReturnValue(null);
    const { container } = renderAction();
    const placeholder = placeholderOf(container);

    expect(placeholder?.tagName).toBe("SPAN");
    expect(placeholder).toHaveTextContent("");
    expect(placeholder?.querySelector("a, button, [tabindex]")).toBeNull();
    expect(placeholder).toHaveClass("pointer-events-none");
  });

  // Without a script there is never an answer.
  it("shows the guest's variant when there is no script", () => {
    useHasSession.mockReturnValue(null);
    const { container } = renderAction();

    expect(placeholderOf(container)).toHaveClass("no-script:hidden");
    expect(cellOf("Get Started")).toHaveClass("no-script:visible");
    expect(cellOf("Open Dashboard")).not.toHaveClass("no-script:visible");
  });

  it("shows a guest the guest's link only", () => {
    useHasSession.mockReturnValue(false);
    const { container } = renderAction();

    expect(placeholderOf(container)).toBeNull();
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
    const { container } = renderAction();

    expect(placeholderOf(container)).toBeNull();
    expect(cellOf("Get Started")).toHaveClass("invisible");
    expect(cellOf("Open Dashboard")).not.toHaveClass("invisible");
  });
});
