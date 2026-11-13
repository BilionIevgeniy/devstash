import { expect, test } from "@playwright/test";
import { SIGNED_OUT } from "./support/storage-state";

// The homepage exists twice, `/` and `/de`, both static: the language is the
// page's, never the visitor's browser or cookie (ADR 0024).
test.describe("the homepage in two languages", () => {
  test.use({ storageState: SIGNED_OUT });

  test("/de is German without a cookie", async ({ page }) => {
    await page.goto("/de");

    await expect(page.locator("div[lang=de]").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Entwicklerwissen/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kostenlos loslegen" }).first(),
    ).toBeVisible();
  });

  test.describe("for a German browser", () => {
    test.use({ locale: "de-DE" });

    test("/ stays English", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByRole("heading", { level: 1, name: /Developer Knowledge/ }),
      ).toBeVisible();
    });
  });

  test("the footer links to the other language", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Deutsch", exact: true })
      .click();

    await expect(page).toHaveURL(/\/de$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Entwicklerwissen/ }),
    ).toBeVisible();
  });
});
