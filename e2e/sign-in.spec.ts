import { expect, test } from "@playwright/test";
import { signInThroughForm } from "./support/sign-in";
import { SIGNED_OUT } from "./support/storage-state";

test.use({ storageState: SIGNED_OUT });

test("signing in with email and password lands on the dashboard", async ({
  page,
}) => {
  await signInThroughForm(page);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }),
  ).toBeVisible();
});
