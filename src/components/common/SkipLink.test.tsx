import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../../test/intl";
import { MAIN_CONTENT_ID } from "@/components/common/main-content";
import { SkipLink } from "@/components/common/SkipLink";

function renderPage(tabIndex?: number) {
  render(
    <>
      <SkipLink />
      <button>Menu</button>
      <main id={MAIN_CONTENT_ID} tabIndex={tabIndex}>
        <button>Content</button>
      </main>
    </>,
  );
  return screen.getByRole("main");
}

async function skip() {
  const user = userEvent.setup();
  await user.tab();
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();
  await user.keyboard("{Enter}");
  return user;
}

describe("SkipLink", () => {
  it("moves the focus to the content, past the navigation", async () => {
    const main = renderPage();

    const user = await skip();
    expect(main).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Content" })).toHaveFocus();
  });

  // A hash would push a history entry Back cannot leave.
  it("leaves the URL as it was", async () => {
    renderPage();
    const before = window.location.href;

    await skip();

    expect(window.location.href).toBe(before);
  });

  it("makes the content focusable for this once only", async () => {
    const main = renderPage();

    const user = await skip();
    expect(main).toHaveAttribute("tabindex", "-1");

    await user.tab();
    expect(main).not.toHaveAttribute("tabindex");
  });

  it("leaves a content that is focusable by itself alone", async () => {
    const main = renderPage(-1);

    const user = await skip();
    expect(main).toHaveFocus();

    await user.tab();
    expect(main).toHaveAttribute("tabindex", "-1");
  });
});
