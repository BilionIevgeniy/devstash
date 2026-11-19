import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { itemHeading, uniqueTitle } from "./support/items";
import { PRO_AUTH_FILE } from "./support/storage-state";

// ADR 0031: a Pro user creates a custom type and an item of it; a rename keeps
// the URLs of the type and of the item. The type name is unique per run, and
// its slug follows from it.
test.use({ storageState: PRO_AUTH_FILE });

async function openTypeDialog(page: Page, button: string, title: string) {
  const dialog = page.getByRole("dialog", { name: title });
  // A click before React has hydrated the button does nothing.
  await expect(async () => {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass();
  return dialog;
}

test("a custom type keeps its URLs through a rename", async ({ page }) => {
  const name = uniqueTitle("Recipes");
  const slug = name.toLowerCase().replace(" ", "-");
  const renamed = `${name} renamed`;

  await page.goto("/settings");
  const create = await openTypeDialog(page, "New type", "New custom type");
  await create.getByLabel("Name", { exact: true }).fill(name);
  // The radio is hidden behind its swatch: a pointer clicks the label.
  const terminal = create.getByRole("radio", { name: "Terminal" });
  await create
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: "Terminal" }) })
    .click();
  await expect(terminal).toBeChecked();
  await create.getByRole("button", { name: "Create", exact: true }).click();
  await expect(create).toBeHidden();

  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(`/items/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);

  const title = uniqueTitle("Pancakes");
  const newItem = await openTypeDialog(page, `New ${name}`, `New ${name}`);
  await newItem.getByLabel("Title", { exact: true }).fill(title);
  await newItem.getByRole("button", { name: "Create", exact: true }).click();
  await expect(newItem).toBeHidden();
  await itemHeading(page, title).click();
  await expect(page).toHaveURL(new RegExp(`/items/${slug}/[^/]+$`));
  const itemUrl = new URL(page.url()).pathname;

  await page.goto("/settings");
  const edit = await openTypeDialog(page, `Edit ${name}`, "Edit custom type");
  await edit.getByLabel("Name", { exact: true }).fill(renamed);
  await edit.getByRole("button", { name: "Save", exact: true }).click();
  await expect(edit).toBeHidden();

  await page.goto(`/items/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(itemHeading(page, title)).toBeVisible();
  await page.goto(itemUrl);
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();
});
