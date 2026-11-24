import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { signInFreshUser } from "./support/fresh-user";
import { SIGNED_OUT } from "./support/storage-state";
import { signOutThroughMenu } from "./support/sign-in";
import { createSnippet, itemHeading, uniqueTitle } from "./support/items";

// A fresh user, since signing out ends the session the saved state would hold.
test.use({ storageState: SIGNED_OUT });

const SIGN_IN_URL = /\/sign-in/;

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
