import { randomUUID } from "node:crypto";
import { expect, type Locator, type Page } from "@playwright/test";

// The database holds the items of earlier tests of the same run, and a test can
// be repeated, so a title is never reused.
export function uniqueTitle(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`;
}

// The card of an item in a list: its title is the heading inside it.
export function itemHeading(page: Page, title: string) {
  return page.getByRole("heading", { level: 2, name: title, exact: true });
}

// Opens the create dialog from the "New <type>" button of a type page. A click
// before React has hydrated the button does nothing, so it is repeated until
// the dialog is open.
export async function openCreateDialog(
  page: Page,
  typePath: string,
  typeName: string,
): Promise<Locator> {
  await page.goto(typePath);
  const dialog = page.getByRole("dialog", { name: `New ${typeName}` });
  await expect(async () => {
    await page
      .getByRole("button", { name: `New ${typeName}`, exact: true })
      .click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass();
  return dialog;
}

// Creates a snippet through the dialog of /items/snippets and waits until its
// card is on the page. Only the title and the tags are filled in: the content
// editor is not needed to create one.
export async function createSnippet(
  page: Page,
  title: string,
  tags: string[] = [],
): Promise<void> {
  const dialog = await openCreateDialog(page, "/items/snippets", "snippet");

  await dialog.getByLabel("Title", { exact: true }).fill(title);
  if (tags.length > 0) {
    await dialog.getByLabel("Tags", { exact: true }).fill(tags.join(", "));
  }
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(itemHeading(page, title)).toBeVisible();
}

// Picks an option of a select by the select's label. The first click on a page
// is repeated until React has hydrated the select and the list is open.
export async function chooseOption(
  page: Page,
  select: string,
  option: string,
): Promise<void> {
  const listOption = page.getByRole("option", { name: option, exact: true });
  await expect(async () => {
    await page.getByRole("combobox", { name: select, exact: true }).click();
    await expect(listOption).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await listOption.click();
}

// The titles of the cards on the page, top to bottom.
export function cardTitles(page: Page) {
  return page.getByRole("heading", { level: 2 });
}
