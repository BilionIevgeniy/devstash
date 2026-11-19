import { expect, test } from "./support/test";
import { signInFreshUser } from "./support/fresh-user";
import { SIGNED_OUT } from "./support/storage-state";

// A fresh user, since signing out ends the session the saved state would hold.
test.use({ storageState: SIGNED_OUT });

const SIGN_IN_URL = /\/sign-in/;

test("Sign out leads home, and the app then sends the visitor to sign-in", async ({
  page,
}) => {
  await signInFreshUser(page, "free");

  // Every answer of a signed-in request sets the session cookie again, so one
  // still on its way after the sign-out would sign the browser back in (see
  // endSession in signed-out.spec.ts).
  await page.waitForLoadState("networkidle");
  // The user area at the foot of the sidebar opens the account menu. The
  // first click is repeated until React has hydrated the trigger.
  const signOut = page.getByRole("menuitem", { name: "Sign out" });
  await expect(async () => {
    await page.getByRole("button", { name: /E2E Tester/ }).click();
    await expect(signOut).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await signOut.click();
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
