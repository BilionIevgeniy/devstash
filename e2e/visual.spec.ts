import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/test";
import { requireE2eUserEmail, visualUserEmail } from "../scripts/e2e-user";
import {
  VISUAL_DRAWER_ITEM,
  VISUAL_USER_NAME,
} from "../scripts/e2e-visual-user";
import { waitForAnimations } from "./support/axe";
import { itemLink } from "./support/items";
import { openPalette } from "./support/palette";
import { SIGNED_OUT, VISUAL_AUTH_FILE } from "./support/storage-state";

// Screenshot baselines of six screens (spec 21, ADR 0035). Fonts render
// differently on each system, so the baselines are Linux only and come from
// the e2e job on its pinned runner: a new or changed one is taken from the
// job's test-results artifact (README, "End-to-end tests"). The user has fixed
// rows and dates (scripts/e2e-visual-user.ts), so only what changes with the
// run or the clock is masked: its email, and the drawer's relative "Updated". The consent is answered in every saved state, so
// the banner is in no baseline.
test.skip(
  process.platform !== "linux",
  "The baselines are Linux only: they come from the e2e job",
);
// No retry: a screenshot that differs on a second try is a fault to fix, not
// to retry away.
test.describe.configure({ retries: 0 });

// The email is new every run; the sidebar's user area shows it under the name.
function runMasks(page: Page) {
  return [page.getByText(visualUserEmail(requireE2eUserEmail()))];
}

async function expectScreen(
  page: Page,
  name: string,
  masks: Locator[] = [],
): Promise<void> {
  await waitForAnimations(page);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    mask: [...runMasks(page), ...masks],
  });
}

test.describe("signed in", () => {
  test.use({ storageState: VISUAL_AUTH_FILE });

  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: new RegExp(VISUAL_USER_NAME) }),
    ).toBeVisible();
    await expectScreen(page, "dashboard");
  });

  test("type list", async ({ page }) => {
    await page.goto("/items/snippets");
    await expect(
      page.getByRole("heading", { level: 2, name: "useDebounce hook" }),
    ).toBeVisible();
    await expectScreen(page, "type-list");
  });

  // A note: its body is Markdown, so no editor loads late into the picture.
  test("drawer", async ({ page }) => {
    await page.goto("/items/notes");
    await itemLink(page, VISUAL_DRAWER_ITEM).click();
    const drawer = page.getByRole("dialog", { name: VISUAL_DRAWER_ITEM });
    await expect(drawer).toBeVisible();
    // "Updated" is relative ("2 years ago", ItemMeta) and moves with the clock.
    await expectScreen(page, "drawer", [drawer.getByText(/ ago$/)]);
  });

  test("palette", async ({ page }) => {
    await page.goto("/dashboard");
    const palette = await openPalette(page);
    await palette.getByRole("combobox").fill("Release");
    await expect(
      palette.getByRole("option", { name: new RegExp(VISUAL_DRAWER_ITEM) }),
    ).toBeVisible();
    await expectScreen(page, "palette");
  });

  test("settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectScreen(page, "settings");
  });
});

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  test("homepage", async ({ page }) => {
    await page.goto("/");
    // The calls to action come with the session's answer, all at once.
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: "Get Started", exact: true }),
    ).toBeVisible();
    // The hero's icons drift, and even at rest each gets a random tilt
    // (chaos-simulation.ts): the panel is masked, the rest is compared.
    await expectScreen(page, "homepage", [
      page.getByRole("figure", { name: "Your knowledge today..." }),
    ]);
  });
});
