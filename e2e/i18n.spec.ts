import { expect, test } from "@playwright/test";
import { E2E_USER_PASSWORD, requireE2eUserEmail } from "../scripts/e2e-user";
import { signInThroughForm } from "./support/sign-in";
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

  test.describe("for an English browser", () => {
    test.use({ locale: "en-US" });

    // The switch keeps the place on the page and remembers the choice for
    // the auth pages, which would otherwise follow the browser.
    test("the navbar switch keeps the section and remembers German", async ({
      page,
    }) => {
      const remembered = (url: string) => url.endsWith("/api/locale");

      // A click before hydration is a plain link: no request, no kept
      // position. Then the whole step runs again.
      await expect(async () => {
        await page.goto("/");
        await page
          .getByRole("heading", { name: "Simple, Transparent Pricing" })
          .evaluate((heading) =>
            heading.scrollIntoView({ block: "center", behavior: "instant" }),
          );
        const response = page.waitForResponse(
          (answer) => remembered(answer.url()) && answer.status() === 204,
          { timeout: 2_000 },
        );
        await page
          .getByRole("banner")
          .getByRole("link", { name: "Diese Seite auf Deutsch" })
          .click();
        await response;
      }).toPass();

      await expect(page).toHaveURL(/\/de$/);
      await expect(
        page.getByRole("heading", { name: "Einfache, transparente Preise" }),
      ).toBeInViewport();

      await page.goto("/sign-in");
      await expect(
        page.getByRole("heading", { level: 1, name: "Anmelden" }),
      ).toBeVisible();
    });
  });
});

// The navbar remounts when / and /de swap layouts. A signed-in user must keep
// the Dashboard link through the switch, never see Sign in flash for a frame.
test.describe("the homepage switch, signed in", () => {
  test("keeps the Dashboard link and never shows Sign in", async ({ page }) => {
    const banner = page.getByRole("banner");
    await page.goto("/");
    await expect(banner.getByRole("link", { name: "Dashboard" })).toBeVisible();

    // A flash lasts a few frames, which a retrying assertion would miss: the
    // page itself notes whether a sign-in link was ever added to the header.
    await page.evaluate(() => {
      const flags = window as unknown as { sawSignIn: boolean };
      flags.sawSignIn = false;
      new MutationObserver(() => {
        if (document.querySelector('header a[href="/sign-in"]')) {
          flags.sawSignIn = true;
        }
      }).observe(document.body, { childList: true, subtree: true });
    });

    await expect(async () => {
      await banner
        .getByRole("link", { name: "Diese Seite auf Deutsch" })
        .click();
      await expect(page).toHaveURL(/\/de$/, { timeout: 1_000 });
    }).toPass();

    await expect(banner.getByRole("link", { name: "Dashboard" })).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as unknown as { sawSignIn: boolean }).sawSignIn,
      ),
    ).toBe(false);
  });
});

// Without a chosen language, the auth pages follow the browser's.
test.describe("the auth pages", () => {
  test.use({ storageState: SIGNED_OUT });

  test.describe("for a German browser", () => {
    test.use({ locale: "de-DE" });

    test("/sign-in is German", async ({ page }) => {
      await page.goto("/sign-in");

      await expect(
        page.getByRole("heading", { level: 1, name: "Anmelden" }),
      ).toBeVisible();
      await expect(page.getByLabel("Passwort", { exact: true })).toBeVisible();
    });
  });

  test("/sign-in is English for an English browser", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(
      page.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeVisible();
  });
});

// The language chosen in the user menu is a cookie of its own: it survives a
// reload, a sign-out and the next sign-in.
test.describe("the language switch", () => {
  test.use({ storageState: SIGNED_OUT });

  test("German stays after a reload, a sign-out and a sign-in", async ({
    page,
  }) => {
    await signInThroughForm(page);
    await expect(page).toHaveURL(/\/dashboard$/);

    const userMenu = page.getByRole("button", {
      name: new RegExp(requireE2eUserEmail()),
    });
    // The first click can land before React has hydrated the menu.
    await expect(async () => {
      await userMenu.click();
      await expect(page.getByRole("menu")).toBeVisible({ timeout: 1_000 });
    }).toPass();
    const german = page.getByRole("menuitemradio", { name: "Deutsch" });
    await german.click();
    // The menu stays open while the switch runs, and shows the new language.
    await expect(german).toBeChecked();
    await page.keyboard.press("Escape");

    // The heading of the sidebar's types, in the shell's words.
    const types = page.getByRole("complementary").getByText("Typen", {
      exact: true,
    });
    await expect(types).toBeVisible();

    await page.reload();
    await expect(types).toBeVisible();

    await userMenu.click();
    await page.getByRole("menuitem", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/sign-in");
    await page
      .getByLabel("E-Mail", { exact: true })
      .fill(requireE2eUserEmail());
    await page.getByLabel("Passwort", { exact: true }).fill(E2E_USER_PASSWORD);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(types).toBeVisible();
  });
});
