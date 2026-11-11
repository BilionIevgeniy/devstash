import { expect, test } from "@playwright/test";
import { createSnippet, itemHeading, uniqueTitle } from "./support/items";

test("a created snippet shows in the snippets list", async ({ page }) => {
  const title = uniqueTitle("Created snippet");

  await createSnippet(page, title);

  await expect(page).toHaveURL(/\/items\/snippets$/);
  await expect(itemHeading(page, title)).toBeVisible();
});

// Focus returning to the card after the route drawer closes is a known open
// bug (context/todo.md, "Items"): it is not asserted here.
test("an item opens in the drawer and Esc closes it", async ({ page }) => {
  const title = uniqueTitle("Drawer snippet");
  await createSnippet(page, title);

  // The click goes through the intercepting route: the list stays behind the
  // drawer, and the URL is the one of the item.
  await itemHeading(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/\/items\/snippets\/[^/]+$/);

  await page.keyboard.press("Escape");

  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/items\/snippets$/);
});
