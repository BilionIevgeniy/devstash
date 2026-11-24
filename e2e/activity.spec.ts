import { signInFreshUser } from "./support/fresh-user";
import { createSnippet, itemLink, uniqueTitle } from "./support/items";
import { SIGNED_OUT } from "./support/storage-state";
import { expect, test } from "./support/test";

// With Cache Components, Next.js keeps the routes a user left mounted but
// hidden (React's <Activity>), so their state comes back with them; effects
// are cleaned up while hidden and run again on return (ADR 0037). These
// journeys pin what must not come back, and what must still work.

test("the code editor still takes input after Back to the item", async ({
  page,
}) => {
  const title = uniqueTitle("Activity editor");
  await createSnippet(page, title);
  const href = await itemLink(page, title).getAttribute("href");
  await page.goto(href ?? "/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Content", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Favorites" }).first().click();
  await expect(page).toHaveURL(/\/favorites$/);
  await page.goBack();
  await expect(page).toHaveURL(href ?? "/");

  // The view mounted anew while hidden, so it comes back in view mode.
  const edit = page.getByRole("button", { name: "Edit", exact: true });
  await expect(edit).toBeVisible();
  await edit.click();
  // Monaco's handle: a click on the label focuses it once it has mounted.
  await expect(async () => {
    await page.getByText("Content", { exact: true }).click();
    await expect(page.getByLabel("Content", { exact: true })).toBeFocused({
      timeout: 1_000,
    });
  }).toPass();
  await page.keyboard.type("echo back-again");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByText("echo back-again")).toBeVisible();
});

test("a confirmation left open in the drawer is closed after Back and Forward", async ({
  page,
}) => {
  const title = uniqueTitle("Activity drawer");
  await createSnippet(page, title);
  await itemLink(page, title).click();
  const drawer = page.getByRole("dialog", { name: title, exact: true });
  await drawer
    .getByRole("button", { name: `Delete ${title}`, exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(drawer).toBeHidden();

  await page.goForward();
  await expect(drawer).toBeVisible();
  await expect(page.getByRole("alertdialog")).toBeHidden();
});

test.describe("a password typed and left", () => {
  test.use({ storageState: SIGNED_OUT });

  test("is gone when the user comes back to the settings", async ({ page }) => {
    await signInFreshUser(page, "free");
    await page.goto("/settings");
    const current = page.getByLabel("Current password", { exact: true });
    await current.fill("typed-and-left");

    await page.getByRole("link", { name: "Favorites" }).first().click();
    await expect(page).toHaveURL(/\/favorites$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/settings$/);

    await expect(current).toHaveValue("");
  });

  test("is gone when the user comes back to sign-in", async ({ page }) => {
    await page.goto("/sign-in");
    const password = page.getByLabel("Password", { exact: true });
    await password.fill("typed-and-left");

    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/sign-in$/);

    await expect(password).toHaveValue("");
  });
});
