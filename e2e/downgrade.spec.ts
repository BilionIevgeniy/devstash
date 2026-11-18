import { expect, test } from "@playwright/test";
import { E2E_KEPT_TYPE } from "../scripts/e2e-user";
import { itemHeading } from "./support/items";
import { OVER_LIMIT_AUTH_FILE } from "./support/storage-state";

// ADR 0032: a former Pro user over the Free limit keeps their items and their
// custom type, but the text is read-only and no item of the kept type is new.
test.use({ storageState: OVER_LIMIT_AUTH_FILE });

test("over the Free limit the edit form changes the collections only", async ({
  page,
}) => {
  await page.goto("/items/snippets");
  // Any of the kept items: the first card of the first page.
  const card = page
    .getByRole("heading", { level: 2, name: /^Kept item/ })
    .first();
  const title = (await card.textContent()) ?? "";
  await itemHeading(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  // A click before React has hydrated the drawer does nothing.
  await expect(async () => {
    await drawer.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(drawer.getByText(/more than 50 items/)).toBeVisible({
      timeout: 2_000,
    });
  }).toPass();

  await expect(drawer.getByLabel("Title", { exact: true })).toBeHidden();
  await expect(
    drawer.getByRole("link", { name: "upgrade to Pro" }),
  ).toHaveAttribute("href", "/upgrade");
});

test("a kept custom type stays visible but takes no new item", async ({
  page,
}) => {
  await page.goto(`/items/${E2E_KEPT_TYPE.toLowerCase()}`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    E2E_KEPT_TYPE,
  );
  await expect(
    // The locked button carries the Pro badge in its name.
    page.getByRole("button", { name: new RegExp(`^New ${E2E_KEPT_TYPE}`) }),
  ).toBeDisabled();
});
