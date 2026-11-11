import { expect, test } from "@playwright/test";
import { SIGNED_OUT } from "./support/storage-state";

test.use({ storageState: SIGNED_OUT });

// Each page has two h1s, the German title first and the English one below: the
// German one is matched.
const LEGAL_PAGES = [
  { link: "Imprint", path: "/impressum", heading: "Impressum" },
  { link: "Privacy", path: "/datenschutz", heading: "Datenschutzerklärung" },
] as const;

for (const { link, path, heading } of LEGAL_PAGES) {
  test(`the footer of the homepage links to ${path}`, async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: link, exact: true })
      .click();

    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: heading, exact: true }),
    ).toBeVisible();
  });
}
