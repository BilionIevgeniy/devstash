import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/components/common/I18nProvider";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/messages";

import { MARKETING_NAMESPACES } from "./marketing-namespaces";
import { Navbar } from "./Navbar";

vi.mock("@/features/auth/components/hooks/use-has-session", () => ({
  useHasSession: () => false,
}));

// A key the provider cannot find is shown as its path ("common.logoHome").
const RAW_KEY = /^[a-z]+[A-Za-z]*(\.[A-Za-z]+)+$/;

// Rendered with the namespaces the static pages send, not with all messages
// as test/intl.tsx does: that is what a visitor gets.
function renderNavbar(locale: Locale) {
  return render(
    <I18nProvider
      locale={locale}
      messages={pickMessages(locale, MARKETING_NAMESPACES)}
    >
      <Navbar />
    </I18nProvider>,
  );
}

function shownTexts(container: HTMLElement): string[] {
  const elements = [container, ...container.querySelectorAll("*")];
  return elements.flatMap((element) => [
    ...[...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim() ?? ""),
    element.getAttribute("aria-label") ?? "",
  ]);
}

describe("the messages of the marketing pages", () => {
  // The logo leads to the homepage of the page's own language.
  it.each([
    ["en", "DevStash home", "/"],
    ["de", "DevStash-Startseite", "/de"],
  ] as const)("name the logo link in %s", (locale, name, href) => {
    renderNavbar(locale);

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  it.each(["en", "de"] as const)(
    "leave no raw key in the navbar and its menu in %s",
    async (locale) => {
      const { container } = renderNavbar(locale);
      await userEvent.click(screen.getByRole("button", { expanded: false }));

      const raw = shownTexts(container).filter((text) => RAW_KEY.test(text));
      expect(raw).toEqual([]);
    },
  );
});
