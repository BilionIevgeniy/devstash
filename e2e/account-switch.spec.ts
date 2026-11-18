import { expect, test } from "@playwright/test";

// An email link finished while another account is signed in leads here: the
// page says what was done and offers to sign out. The session of this test is
// its own copy of the saved one, so signing out leaves the other tests signed in.
test("the switch page names the finished step and signs out on request", async ({
  page,
}) => {
  await page.goto("/switch-account?reason=password");

  await expect(
    page.getByRole("heading", { name: "Password updated" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Stay signed in" }),
  ).toHaveAttribute("href", "/dashboard");

  await page
    .getByRole("button", { name: "Sign out and switch account" })
    .click();

  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the switch page sends a visitor to sign-in", async ({ page }) => {
    await page.goto("/switch-account?reason=email");
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
