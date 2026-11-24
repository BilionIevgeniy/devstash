import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../../test/intl";

// The router, which scrolls to the target, is Next's own.
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));

import { InPageLink } from "./InPageLink";

function renderPage() {
  render(
    <>
      <InPageLink href="/agb#agb-en">English version below</InPageLink>
      <button>German</button>
      <article id="agb-en" aria-label="English">
        <button>English</button>
      </article>
    </>,
  );
  return screen.getByRole("article");
}

describe("InPageLink", () => {
  it("takes the focus along, so Tab goes on inside the target", async () => {
    const target = renderPage();
    const user = userEvent.setup();

    await user.tab();
    await user.keyboard("{Enter}");
    expect(target).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "English" })).toHaveFocus();
    expect(target).not.toHaveAttribute("tabindex");
  });

  it("leaves the focus alone when the link opens elsewhere", async () => {
    const target = renderPage();
    const user = userEvent.setup();

    await user.keyboard("{Meta>}");
    await user.click(screen.getByRole("link"));

    expect(target).not.toHaveFocus();
  });
});
