import type { Locator, Page, Route } from "@playwright/test";
import { expect, test } from "./support/test";
import { SIGNED_OUT } from "./support/storage-state";
import { PAINTED_THEMES, startInTheme } from "./support/theme";

// The homepage is static and learns of the session after it has painted
// (ADR 0037). Until the answer, a placeholder holds the place of each action
// that depends on it, and it must have the size and look of the button that
// replaces it ("No flash of the wrong state" in coding-standards.md). The
// journeys and the screenshots wait for the answer, so they never see the
// placeholder: this spec holds the answer back, measures the placeholder,
// lets the answer through and measures the button that took its place.

const SESSION = "**/api/auth/session";

// Every answer of /api/auth/session waits until the returned function runs.
async function holdSessionAnswer(page: Page): Promise<() => Promise<void>> {
  const held: Route[] = [];
  await page.route(SESSION, (route) => {
    held.push(route);
  });
  return async () => {
    await expect.poll(() => held.length).toBeGreaterThan(0);
    await Promise.all(held.map((route) => route.continue()));
    // A request still caught by the handler is let through by the unroute.
    await page.unroute(SESSION);
  };
}

interface Look {
  left: number;
  right: number;
  width: number;
  height: number;
  background: string;
}

async function lookOf(locator: Locator): Promise<Look> {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      width: box.width,
      height: box.height,
      background: getComputedStyle(element).backgroundColor,
    };
  });
}

// A placeholder is hidden from assistive technology, so no role finds it:
// it is found by that attribute, next to the action it stands for.
// The navbar's own placeholder is the button-like child of its wrapper.
const navbarPlaceholder = (page: Page) =>
  page.getByRole("banner").locator('span[aria-hidden="true"] > span').first();

// The hero's is the sibling of the cells of its action, found from the
// guest's link, which is in the page but unseen until the answer.
const heroPlaceholder = (page: Page) =>
  page
    .getByRole("main")
    .getByRole("link", { name: "Get Started Free", includeHidden: true })
    .first()
    .locator(
      'xpath=ancestor::div[span[@aria-hidden="true"]][1]/span[@aria-hidden="true"]',
    );

// Same height, the same right edge and the same colour as the button; at
// least as wide (it holds the wider of the two answers' buttons).
function expectSameLook(placeholder: Look, button: Look): void {
  expect(placeholder.background).toBe(button.background);
  expect(Math.abs(placeholder.height - button.height)).toBeLessThan(0.5);
  expect(Math.abs(placeholder.right - button.right)).toBeLessThan(0.5);
  expect(placeholder.width).toBeGreaterThanOrEqual(button.width - 0.5);
}

const ANSWERS = [
  {
    name: "a guest",
    storageState: SIGNED_OUT,
    navbarButton: "Get Started",
    heroButton: "Get Started Free",
  },
  {
    name: "a signed-in visitor",
    storageState: undefined,
    navbarButton: "Dashboard",
    heroButton: "Open Dashboard",
  },
] as const;

const VIEWPORTS = [
  { name: "desktop", size: { width: 1280, height: 800 } },
  { name: "phone", size: { width: 375, height: 800 } },
] as const;

for (const theme of PAINTED_THEMES) {
  for (const viewport of VIEWPORTS) {
    for (const answer of ANSWERS) {
      test.describe(`${theme}, ${viewport.name}, ${answer.name}`, () => {
        test.use({
          viewport: viewport.size,
          ...(answer.storageState ? { storageState: answer.storageState } : {}),
        });

        test("the placeholders look like the buttons that replace them", async ({
          page,
        }) => {
          await startInTheme(page, theme);
          const release = await holdSessionAnswer(page);
          await page.goto("/");

          const navbarBefore = await lookOf(navbarPlaceholder(page));
          const heroBefore = await lookOf(heroPlaceholder(page));

          await release();
          const navbarButton = page
            .getByRole("banner")
            .getByRole("link", { name: answer.navbarButton, exact: true });
          const heroButton = page
            .getByRole("main")
            .getByRole("link", { name: answer.heroButton, exact: true })
            .first();
          await expect(navbarButton).toBeVisible();
          await expect(heroButton).toBeVisible();

          expectSameLook(navbarBefore, await lookOf(navbarButton));
          expectSameLook(heroBefore, await lookOf(heroButton));
        });
      });
    }
  }
}
