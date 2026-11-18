import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  captureFocusTargets,
  NO_FOCUS_TARGETS,
  restoreFocus,
} from "@/features/items/_internal/components/drawer/focus-targets";

function List({ rows }: { rows: string[] }) {
  return (
    <ul>
      {rows.map((row) => (
        <li key={row}>
          <a href={`#${row}`} data-item-trigger="">
            {row}
          </a>
          <button type="button">{`Delete ${row}`}</button>
        </li>
      ))}
    </ul>
  );
}

const trigger = (name: string) => screen.getByRole("link", { name });

describe("restoreFocus", () => {
  it("gives the focus back to the opener while it is on the page", () => {
    render(<List rows={["a", "b", "c"]} />);
    const targets = captureFocusTargets(trigger("b"));

    restoreFocus(targets, vi.fn());

    expect(trigger("b")).toHaveFocus();
  });

  it("moves to the next row when the opener has left the page", () => {
    const { rerender } = render(<List rows={["a", "b", "c"]} />);
    const targets = captureFocusTargets(trigger("b"));
    rerender(<List rows={["a", "c"]} />);

    restoreFocus(targets, vi.fn());

    expect(trigger("c")).toHaveFocus();
  });

  it("moves to the row before when the opener was the last one", () => {
    const { rerender } = render(<List rows={["a", "b"]} />);
    const targets = captureFocusTargets(trigger("b"));
    rerender(<List rows={["a"]} />);

    restoreFocus(targets, vi.fn());

    expect(trigger("a")).toHaveFocus();
  });

  it("passes over an opener that is about to leave", () => {
    render(<List rows={["a", "b", "c"]} />);
    const targets = captureFocusTargets(trigger("b"));

    restoreFocus(targets, vi.fn(), { skipOpener: true });

    expect(trigger("c")).toHaveFocus();
  });

  it("finds the rows around a control inside a row, such as its delete", () => {
    render(<List rows={["a", "b", "c"]} />);
    const targets = captureFocusTargets(
      screen.getByRole("button", { name: "Delete b" }),
    );

    restoreFocus(targets, vi.fn(), { skipOpener: true });

    expect(trigger("c")).toHaveFocus();
  });

  it("falls back when no row is left, or nothing was opened", () => {
    const { rerender } = render(<List rows={["a"]} />);
    const targets = captureFocusTargets(trigger("a"));
    rerender(<List rows={[]} />);
    const fallback = vi.fn();

    restoreFocus(targets, fallback);
    restoreFocus(NO_FOCUS_TARGETS, fallback);

    expect(fallback).toHaveBeenCalledTimes(2);
  });
});
