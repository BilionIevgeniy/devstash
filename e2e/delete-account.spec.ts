import { expect, test } from "./support/test";
import { requireE2eUserEmail } from "../scripts/e2e-user";

// The page of the emailed deletion link renders only; these states need no
// email and delete nothing.
function deletionLink(email: string, token: string): string {
  return `/settings/delete-account?${new URLSearchParams({ token, email }).toString()}`;
}

test("a deletion link that is not valid says so and leads back to the settings", async ({
  page,
}) => {
  await page.goto(deletionLink(requireE2eUserEmail(), "not-a-real-token"));

  await expect(
    page.getByRole("heading", { name: "Confirmation link expired" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete account permanently" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to settings" }),
  ).toHaveAttribute("href", "/settings");
});

test("a deletion link for another address offers to switch accounts", async ({
  page,
}) => {
  await page.goto(deletionLink("someone-else@example.com", "any-token"));

  await expect(
    page.getByRole("heading", { name: "This link is for another account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out and switch account" }),
  ).toBeVisible();
});
