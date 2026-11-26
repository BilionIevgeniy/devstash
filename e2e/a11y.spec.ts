import { expect, test } from "./support/test";
import { VISUAL_DRAWER_ITEM } from "../scripts/e2e-visual-user";
import { expectNoSeriousViolations } from "./support/axe";
import { waitForPage } from "./support/held/blocks";
import { itemLink, openCreateDialog } from "./support/items";
import { openPalette } from "./support/palette";
import {
  FRESH_VISITOR,
  SIGNED_OUT,
  VISUAL_AUTH_FILE,
} from "./support/storage-state";
import { PAINTED_THEMES, startInTheme } from "./support/theme";

// axe on the main pages (spec 21): no serious or critical violation of WCAG
// 2.2 A and AA. Signed-in pages as the user with fixed rows, who never
// changes, so a scan reads the same page every run. Every scan runs in both
// themes (ADR 0039); the skip link's journey, which checks no colour, once.

for (const theme of PAINTED_THEMES) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await startInTheme(page, theme);
    });

    test.describe("signed in", () => {
      test.use({ storageState: VISUAL_AUTH_FILE });

      for (const path of [
        "/dashboard",
        "/items/snippets",
        "/items/notes",
        "/favorites",
        "/pinned",
        "/collections",
        "/settings",
        "/profile",
        "/upgrade",
        "/settings/locked-files",
        "/collections/does-not-exist",
      ]) {
        test(`${path} has no serious violations`, async ({ page }) => {
          await page.goto(path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          // Its loading state is scanned in skeletons.spec.ts.
          await waitForPage(page);
          await expectNoSeriousViolations(page);
        });
      }

      test("the item drawer has no serious violations", async ({ page }) => {
        await page.goto("/items/notes");
        await itemLink(page, VISUAL_DRAWER_ITEM).click();
        await expect(
          page.getByRole("dialog", { name: VISUAL_DRAWER_ITEM }),
        ).toBeVisible();
        await expectNoSeriousViolations(page);
      });

      test("an item's own page has no serious violations", async ({ page }) => {
        await page.goto("/items/notes");
        const href = await itemLink(page, VISUAL_DRAWER_ITEM).getAttribute(
          "href",
        );
        await page.goto(href ?? "/");
        await expect(
          page.getByRole("heading", { level: 1, name: VISUAL_DRAWER_ITEM }),
        ).toBeVisible();
        await expectNoSeriousViolations(page);

        const edit = page.getByRole("button", { name: "Edit", exact: true });
        await expect(async () => {
          await edit.click();
          await expect(page.getByLabel("Title", { exact: true })).toBeVisible({
            timeout: 2_000,
          });
        }).toPass();
        await expectNoSeriousViolations(page);
      });

      test("a collection's page has no serious violations", async ({
        page,
      }) => {
        await page.goto("/collections");
        await page
          .getByRole("link", { name: /React Patterns/ })
          .last()
          .click();
        await expect(
          page.getByRole("heading", { level: 1, name: "React Patterns" }),
        ).toBeVisible();
        await expectNoSeriousViolations(page);
      });

      for (const [name, path, opener] of [
        ["the item delete", "/items/notes", `Delete ${VISUAL_DRAWER_ITEM}`],
        ["the account delete", "/settings", "Delete account"],
      ] as const) {
        test(`${name} dialog has no serious violations`, async ({ page }) => {
          await page.goto(path);
          if (path === "/items/notes") {
            await itemLink(page, VISUAL_DRAWER_ITEM).click();
          }
          const dialog = page.getByRole("alertdialog");
          await expect(async () => {
            await page
              .getByRole("button", { name: opener, exact: true })
              .click();
            await expect(dialog).toBeVisible({ timeout: 2_000 });
          }).toPass();
          await expectNoSeriousViolations(page);
        });
      }

      test("the search palette has no serious violations", async ({ page }) => {
        await page.goto("/dashboard");
        const palette = await openPalette(page);
        await palette.getByRole("combobox").fill("Release");
        await expect(
          palette.getByRole("option", { name: new RegExp(VISUAL_DRAWER_ITEM) }),
        ).toBeVisible();
        // The recent list holds that row too: wait for the answer.
        await expect(palette.getByRole("option")).toHaveCount(1);
        await expectNoSeriousViolations(page);
      });

      test("the create dialog has no serious violations", async ({ page }) => {
        await openCreateDialog(page, "/items/notes", "Note");
        await expectNoSeriousViolations(page);
      });
    });

    test.describe("signed out", () => {
      test.use({ storageState: SIGNED_OUT });

      // The calls to action come with the session's answer: the scan reads them,
      // not the placeholder.
      for (const [path, action] of [
        ["/", "Get Started"],
        ["/de", "Loslegen"],
      ] as const) {
        test(`${path} has no serious violations`, async ({ page }) => {
          await page.goto(path);
          await expect(
            page
              .getByRole("banner")
              .getByRole("link", { name: action, exact: true }),
          ).toBeVisible();
          await expectNoSeriousViolations(page);
        });
      }

      for (const path of [
        "/sign-in",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/agb",
        "/datenschutz",
        "/impressum",
        "/vertraege-kuendigen",
      ]) {
        test(`${path} has no serious violations`, async ({ page }) => {
          await page.goto(path);
          // The legal pages hold a German and an English document.
          await expect(
            page.getByRole("heading", { level: 1 }).first(),
          ).toBeVisible();
          await expectNoSeriousViolations(page);
        });
      }
    });

    test.describe("a first visit", () => {
      test.use({ storageState: FRESH_VISITOR });

      test("the homepage with the consent banner has no serious violations", async ({
        page,
      }) => {
        await page.goto("/");
        await expect(
          page.getByRole("region", { name: "Performance measurement" }),
        ).toBeVisible();
        await expect(
          page
            .getByRole("banner")
            .getByRole("link", { name: "Get Started", exact: true }),
        ).toBeVisible();
        await expectNoSeriousViolations(page);
      });
    });
  });
}

test.describe("the skip link", () => {
  test.use({ storageState: VISUAL_AUTH_FILE });

  // The shell's <main> scrolls and is no Tab stop of its own.
  test("the skip link leads past the navigation and leaves Back alone", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();

    // The palette opens only once React has hydrated the page.
    await openPalette(page);
    await page.keyboard.press("Escape");
    await skip.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await expect(page).toHaveURL("/dashboard");

    await page.getByRole("link", { name: "Favorites" }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Favorites" }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible();
  });
});
