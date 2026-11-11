import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

// The database holds the items of earlier tests of the same run, and a test can
// be repeated, so a title is never reused.
export function uniqueTitle(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`;
}

// The card of an item in a list: its title is the heading inside it.
export function itemHeading(page: Page, title: string) {
  return page.getByRole("heading", { level: 2, name: title, exact: true });
}

// Creates a snippet through the dialog of /items/snippets and waits until its
// card is on the page. Only the title is filled in: the content editor is not
// needed to create one.
export async function createSnippet(page: Page, title: string): Promise<void> {
  await page.goto("/items/snippets");
  const dialog = page.getByRole("dialog", { name: "New snippet" });
  // A click before React has hydrated the button does nothing, so it is
  // repeated until the dialog is open.
  await expect(async () => {
    await page
      .getByRole("button", { name: "New snippet", exact: true })
      .click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass();

  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(itemHeading(page, title)).toBeVisible();
}
