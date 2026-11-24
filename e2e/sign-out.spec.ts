import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { signInFreshUser } from "./support/fresh-user";
import { SIGNED_OUT } from "./support/storage-state";
import { E2E_USER_PASSWORD } from "../scripts/e2e-user";
import { signInThroughForm, signOutThroughMenu } from "./support/sign-in";
import { createSnippet, itemHeading, uniqueTitle } from "./support/items";

// A fresh user, since signing out ends the session the saved state would hold.
test.use({ storageState: SIGNED_OUT });

const SIGN_IN_URL = /\/sign-in/;
const NEW_PASSWORD = "e2e-new-password-42";

function userArea(page: Page) {
  return page.getByRole("button", { name: /E2E Tester/ });
}

test("Sign out leads home, and the app then sends the visitor to sign-in", async ({
  page,
}) => {
  await signInFreshUser(page, "free");

  // The user area at the foot of the sidebar opens the account menu.
  await signOutThroughMenu(page, { trigger: userArea(page), item: "Sign out" });
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(
    page.getByRole("link", { name: "Sign in" }).first(),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(SIGN_IN_URL);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

// Routes the user left stay mounted but hidden (ADR 0037): Back right after a
// sign-out must not bring the last user's pages back, on a shared machine.
test("Back after a sign-out shows none of the user's pages", async ({
  page,
}) => {
  await signInFreshUser(page, "free");
  const title = uniqueTitle("Gone after sign-out");
  await createSnippet(page, title);
  await expect(itemHeading(page, title)).toBeVisible();

  await signOutThroughMenu(page, { trigger: userArea(page), item: "Sign out" });
  await expect(page).toHaveURL(/:\d+\/$/);

  await page.goBack();
  await expect(page.getByText(title)).toHaveCount(0);
  await expect(page).toHaveURL(/\/sign-in|:\d+\/$/);
});

// A session that ends on the server reaches sign-in through a soft redirect:
// the sign-in page then loads as a new document (FreshAuthDocument), so Back
// cannot bring the hidden routes of that session back (ADR 0037).
test("a session revoked on another device leaves nothing behind for Back", async ({
  page,
  browser,
}) => {
  const email = await signInFreshUser(page, "free");
  const title = uniqueTitle("Gone after revocation");
  await createSnippet(page, title);
  await expect(itemHeading(page, title)).toBeVisible();

  // Another device changes the password, which revokes every session.
  const other = await browser.newContext({ storageState: SIGNED_OUT });
  const device = await other.newPage();
  await signInThroughForm(device, email);
  await device.waitForURL(/\/dashboard$/);
  await device.goto("/settings");
  await device
    .getByLabel("Current password", { exact: true })
    .fill(E2E_USER_PASSWORD);
  await device.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await device
    .getByLabel("Confirm new password", { exact: true })
    .fill(NEW_PASSWORD);
  await device.getByRole("button", { name: "Update password" }).click();
  await expect(device).toHaveURL(SIGN_IN_URL);
  await other.close();

  await page.getByRole("link", { name: "Favorites" }).first().click();
  await expect(page).toHaveURL(SIGN_IN_URL);
  await page.goBack();
  await expect(page.getByText(title)).toHaveCount(0);
});
