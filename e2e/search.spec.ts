import { expect, test } from "@playwright/test";
import { createSnippet, uniqueTitle } from "./support/items";

// The palette searches in Postgres through GET /api/search (ADR 0018): typing
// finds the new item by a tag, and choosing it opens the drawer.
test("the palette finds an item by its tag and opens it", async ({ page }) => {
  const title = uniqueTitle("Searched snippet");
  const tag = `tag${title.split(" ").at(-1)}`;
  await createSnippet(page, title, [tag]);

  const palette = page.getByRole("dialog", { name: "Search", exact: true });
  // A click before React has hydrated the button does nothing.
  await expect(async () => {
    await page
      .getByRole("button", { name: "Search items and collections" })
      .click();
    await expect(palette).toBeVisible({ timeout: 2_000 });
  }).toPass();

  await palette.getByRole("combobox").fill(tag);
  const result = palette.getByRole("option", { name: title, exact: true });
  await expect(result).toBeVisible();
  await result.click();

  await expect(palette).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: title, exact: true }),
  ).toBeVisible();
});
