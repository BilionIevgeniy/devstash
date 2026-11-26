import { expect, test } from "./support/test";
import { SIGNED_OUT } from "./support/storage-state";

// Every page names itself in the tab and the history (WCAG 2.4.2): the app's
// and the auth pages through the template of their layouts, in the language
// of the request; the marketing pages keep their own titles, which already end
// in the brand.
test("the app's pages are named, also after a link and Back", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveTitle("Dashboard | DevStash");
  await page.goto("/items/snippets");
  await expect(page).toHaveTitle("Snippets | DevStash");

  await page
    .getByRole("complementary")
    .getByRole("link", { name: /^Notes/ })
    .click();
  await expect(page).toHaveURL(/\/items\/notes$/);
  await expect(page).toHaveTitle("Notes | DevStash");
  await page.goBack();
  await expect(page).toHaveTitle("Snippets | DevStash");
});

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  test("the auth and marketing pages keep their titles", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveTitle("Sign in | DevStash");
    await page.goto("/agb");
    await expect(page).toHaveTitle("AGB / Terms - DevStash");
    await page.goto("/");
    await expect(page).toHaveTitle(/^DevStash - /);
  });
});
