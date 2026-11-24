import { readFile } from "node:fs/promises";
import type { FileChooser } from "@playwright/test";
import { expect, test } from "./support/test";
import { signInFreshUser } from "./support/fresh-user";
import {
  createSnippet,
  itemHeading,
  itemLink,
  uniqueTitle,
} from "./support/items";
import { SIGNED_OUT } from "./support/storage-state";

// Export and import are Pro. A fresh Pro user, so the export holds exactly
// the one snippet this test makes and the summary is known in advance.
test.use({ storageState: SIGNED_OUT });

test("an exported snippet comes back through the import", async ({
  page,
}, testInfo) => {
  await signInFreshUser(page, "pro");
  const title = uniqueTitle("Round trip snippet");
  await createSnippet(page, title);

  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON" }).click(),
  ]);
  const file = testInfo.outputPath("export.json");
  await download.saveAs(file);
  expect(await readFile(file, "utf8")).toContain(title);

  await page.goto("/items/snippets");
  await itemLink(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  await drawer
    .getByRole("button", { name: `Delete ${title}`, exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  // The card hides at once (optimistic); the toast comes with the server's
  // answer, so the row is gone before the export goes back in.
  await expect(page.getByText("Item deleted")).toBeVisible();

  // A file set before React has hydrated the input starts nothing, so the
  // button that opens the picker is clicked until the picker opens.
  await page.goto("/settings");
  let chooser: FileChooser | undefined;
  await expect(async () => {
    [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 2_000 }),
      page.getByRole("button", { name: "Import JSON" }).click(),
    ]);
  }).toPass();
  await chooser?.setFiles(file);
  const summary = page
    .getByRole("status")
    .filter({ hasText: "Import finished." });
  await expect(summary).toContainText("1 created, 0 already there.");

  await page.goto("/items/snippets");
  await expect(itemHeading(page, title)).toBeVisible();
});
