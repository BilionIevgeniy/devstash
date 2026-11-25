import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { requireE2eUserEmail } from "../scripts/e2e-user";
import { SIGNED_OUT } from "./support/storage-state";
import { expectPainted, pickTheme } from "./support/theme";

// The theme a visitor chooses (ADR 0039): stored in the browser, applied by
// an inline script before the first paint, so the static pages stay static,
// and the same choice in the footer, the user menu and the settings.

const footerPicker = (page: Page) =>
  page.getByRole("contentinfo").getByRole("group", { name: "Appearance" });

const DARK_ON_HTML = /<html[^>]*class="[^"]*\bdark\b/;

test.describe("a visitor", () => {
  test.use({ storageState: SIGNED_OUT });

  test("gets the chosen theme before any bundle runs", async ({ page }) => {
    await page.goto("/");
    await pickTheme(footerPicker(page), "Light");
    await expectPainted(page, "light");

    // The server's page is the same for everyone: dark, as it was built.
    const served = await page.request.get("/");
    expect(await served.text()).toMatch(DARK_ON_HTML);

    // With every bundle of the page blocked, only the inline script can
    // paint the page light.
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectPainted(page, "light");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).colorScheme,
      ),
    ).toBe("light");
  });

  test.describe("with a light system", () => {
    test.use({ colorScheme: "light" });

    test("is dark until they choose", async ({ page }) => {
      await page.goto("/");
      await expect(
        footerPicker(page).getByRole("radio", { name: "Dark" }),
      ).toBeChecked();
      await expectPainted(page, "dark");
    });

    test("follows the system once they choose it, also when it switches", async ({
      page,
    }) => {
      await page.goto("/de");
      await pickTheme(
        page
          .getByRole("contentinfo")
          .getByRole("group", { name: "Darstellung" }),
        "System",
      );
      await expectPainted(page, "light");

      await page.emulateMedia({ colorScheme: "dark" });
      await expectPainted(page, "dark");
      await page.emulateMedia({ colorScheme: "light" });
      await expectPainted(page, "light");
    });
  });
});

// The default session of the run user. The homepage is soft-navigated to the
// app and back, so the pages left stay mounted but hidden (Activity) with a
// picker of their own: one choice must hold in every one of them.
test("the choice carries from the homepage into the app and back", async ({
  page,
}) => {
  await page.goto("/");
  await pickTheme(footerPicker(page), "Light");

  await page
    .getByRole("banner")
    .getByRole("link", { name: "Dashboard", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectPainted(page, "light");

  const userMenu = page.getByRole("button", {
    name: new RegExp(requireE2eUserEmail()),
  });
  // The first click can land before React has hydrated the menu.
  await expect(async () => {
    await userMenu.click();
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 1_000 });
  }).toPass();
  const themes = page.getByRole("group", { name: "Appearance" });
  await expect(
    themes.getByRole("menuitemradio", { name: "Light" }),
  ).toBeChecked();
  // The menu stays open, so the page is seen changing behind it.
  await themes.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(
    themes.getByRole("menuitemradio", { name: "Dark" }),
  ).toBeChecked();
  await expectPainted(page, "dark");

  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const settingsPicker = page
    .getByRole("main")
    .getByRole("group", { name: "Appearance" });
  await expect(
    settingsPicker.getByRole("radio", { name: "Dark" }),
  ).toBeChecked();
  await pickTheme(settingsPicker, "Light");
  await expectPainted(page, "light");

  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    footerPicker(page).getByRole("radio", { name: "Light" }),
  ).toBeChecked();
  await expectPainted(page, "light");
});
