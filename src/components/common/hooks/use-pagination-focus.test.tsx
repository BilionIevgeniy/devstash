import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../../../test/intl";
import { usePaginationFocus } from "./use-pagination-focus";

function Pages({ page, last }: { page: number; last: boolean }) {
  const { navRef, onActivate } = usePaginationFocus(page);
  return (
    <nav ref={navRef} onClick={onActivate}>
      <a href="#current" aria-current="page">
        {page}
      </a>
      {last ? <span>Next</span> : <a href="#next">Next</a>}
    </nav>
  );
}

describe("usePaginationFocus", () => {
  it("moves the focus to the current page when the used link is gone", async () => {
    const { rerender } = render(<Pages page={1} last={false} />);
    await userEvent.click(screen.getByRole("link", { name: "Next" }));
    rerender(<Pages page={2} last />);
    expect(screen.getByRole("link", { name: "2" })).toHaveFocus();
  });

  it("leaves the focus where it is when the used link is still there", async () => {
    const { rerender } = render(<Pages page={1} last={false} />);
    const next = screen.getByRole("link", { name: "Next" });
    await userEvent.click(next);
    rerender(<Pages page={2} last={false} />);
    expect(next).toHaveFocus();
  });

  it("does nothing on a page change it did not start", () => {
    const { rerender } = render(<Pages page={1} last={false} />);
    rerender(<Pages page={2} last />);
    expect(document.body).toHaveFocus();
  });
});
