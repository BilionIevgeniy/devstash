import { expect, test } from "@playwright/test";
import { createSnippet, openCreateDialog, uniqueTitle } from "./support/items";
import { signInFreshUser } from "./support/fresh-user";
import { SIGNED_OUT } from "./support/storage-state";

// A fresh Free user with 49 items (scripts/e2e-fixture.ts): the 50th is the
// last one the plan allows, the 51st is refused and the form stays open with
// what was typed. A new user every time, so a retry starts at 49 again.
test.use({ storageState: SIGNED_OUT });

test("the Free plan takes the 50th item and refuses the 51st", async ({
  page,
}) => {
  await signInFreshUser(page, "near-limit");

  await createSnippet(page, uniqueTitle("Fiftieth"));

  const dialog = await openCreateDialog(page, "/items/snippets", "Snippet");
  const title = uniqueTitle("Fifty-first");
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByRole("button", { name: "Create", exact: true }).click();

  await expect(
    page.getByText(
      "You have reached the Free plan's limit of 50 items. Upgrade to Pro for unlimited items.",
    ),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue(title);
});
