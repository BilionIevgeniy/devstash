import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { render, screen, waitFor } from "../../../../../test/intl";
import { MobileDrawer } from "./MobileDrawer";

function Shell() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setIsOpen(true)}>
        Open
      </button>
      <MobileDrawer
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        returnFocusRef={buttonRef}
      >
        <a href="#here">A page</a>
      </MobileDrawer>
    </>
  );
}

describe("MobileDrawer", () => {
  it("gives the focus back to its button, and closes on a link", async () => {
    const user = userEvent.setup();
    render(<Shell />);
    const button = screen.getByRole("button", { name: "Open" });

    await user.click(button);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(button).toHaveFocus());

    await user.click(button);
    await user.click(screen.getByRole("link", { name: "A page" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
