import { expect, test } from "@playwright/test";
import { E2E_USER_PASSWORD } from "../scripts/e2e-user";
import { signInFreshUser } from "./support/fresh-user";
import { signInThroughForm } from "./support/sign-in";
import { SIGNED_OUT } from "./support/storage-state";

// A password change revokes every session of its user and signs this browser
// out through a Server Action that redirects (ChangePasswordForm). A fresh
// user every time (ADR 0035): a retry must not meet a password it does not
// know, and the password check is rate-limited per user. Reset and confirm-
// email need a token from an email and stay with the component tests.
test.use({ storageState: SIGNED_OUT });

const NEW_PASSWORD = "e2e-new-password-42";

test("a changed password signs the user out, and only the new one signs in", async ({
  page,
}) => {
  const email = await signInFreshUser(page, "free");

  await page.goto("/settings");
  await page
    .getByLabel("Current password", { exact: true })
    .fill(E2E_USER_PASSWORD);
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByText("Password updated. Please sign in again."),
  ).toBeVisible();

  await signInThroughForm(page, email, E2E_USER_PASSWORD);
  await expect(page.getByText("Invalid email or password")).toBeVisible();

  await signInThroughForm(page, email, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
});
