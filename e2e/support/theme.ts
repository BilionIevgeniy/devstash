import { expect, type Locator, type Page } from "@playwright/test";
import { THEME_STORAGE_KEY, type ResolvedTheme } from "../../src/lib/theme";

// Both themes a scan or a screenshot runs in (ADR 0039).
export const PAINTED_THEMES: readonly ResolvedTheme[] = ["dark", "light"];

// Every page of the test opens in this theme: the choice is in storage before
// any script of the page runs, the inline theme script included. A choice the
// test made itself is kept, so a reload inside a journey does not undo it.
export async function startInTheme(
  page: Page,
  theme: ResolvedTheme,
): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, value);
      }
    },
    { key: THEME_STORAGE_KEY, value: theme },
  );
}

const DARK_CLASS = /(^|\s)dark(\s|$)/;

/** <html> is painted in this theme. */
export async function expectPainted(
  page: Page,
  theme: ResolvedTheme,
): Promise<void> {
  const html = page.locator("html");
  if (theme === "dark") await expect(html).toHaveClass(DARK_CLASS);
  else await expect(html).not.toHaveClass(DARK_CLASS);
}

// The radio of a picker is hidden behind its label: a pointer clicks the
// label. The radios exist only once the picker has hydrated, so finding one
// also waits for that.
export async function pickTheme(
  picker: Locator,
  name: "System" | "Light" | "Dark",
): Promise<void> {
  const radio = picker.getByRole("radio", { name, exact: true });
  await expect(radio).toBeAttached();
  // `has` is resolved inside each label, so its locator starts at the page.
  await picker
    .locator("label")
    .filter({ has: picker.page().getByRole("radio", { name, exact: true }) })
    .click();
  await expect(radio).toBeChecked();
}
