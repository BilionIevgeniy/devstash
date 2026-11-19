import { expect, test } from "@playwright/test";
import { VISUAL_DRAWER_ITEM } from "../scripts/e2e-visual-user";
import { expectNoSeriousViolations } from "./support/axe";
import { itemLink, openCreateDialog } from "./support/items";
import { openPalette } from "./support/palette";
import {
  FRESH_VISITOR,
  SIGNED_OUT,
  VISUAL_AUTH_FILE,
} from "./support/storage-state";

// axe on the main pages (spec 21): no serious or critical violation of WCAG
// 2.2 A and AA. Signed-in pages as the user with fixed rows, who never
// changes, so a scan reads the same page every run.

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
  ]) {
    test(`${path} has no serious violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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

  test("the search palette has no serious violations", async ({ page }) => {
    await page.goto("/dashboard");
    const palette = await openPalette(page);
    await palette.getByRole("combobox").fill("Release");
    await expect(
      palette.getByRole("option", { name: new RegExp(VISUAL_DRAWER_ITEM) }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("the create dialog has no serious violations", async ({ page }) => {
    await openCreateDialog(page, "/items/notes", "Note");
    await expectNoSeriousViolations(page);
  });
});

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  for (const path of [
    "/",
    "/de",
    "/sign-in",
    "/register",
    "/forgot-password",
  ]) {
    test(`${path} has no serious violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    await expectNoSeriousViolations(page);
  });
});
