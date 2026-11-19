import { expect, type Locator, type Page } from "@playwright/test";

// Opens the search palette from the top bar. A click before React has
// hydrated the button does nothing, so it is repeated until the dialog shows.
export async function openPalette(page: Page): Promise<Locator> {
  const palette = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(async () => {
    await page
      .getByRole("button", { name: "Search items and collections" })
      .click();
    await expect(palette).toBeVisible({ timeout: 2_000 });
  }).toPass();
  return palette;
}
