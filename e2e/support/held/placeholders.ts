import { expect, type Locator, type Page } from "@playwright/test";
import {
  hasBar,
  type Block,
  type CompareOptions,
} from "../../../scripts/block-layout";
import type { ResolvedTheme } from "../../../src/lib/theme";
import { expectNoSeriousViolations, waitForAnimations } from "../axe";
import {
  expectSameBlocks,
  measureSettled,
  measureThemes,
  SKELETON,
} from "./blocks";
import type { ReleaseReads } from "./hold-reads";
import { holdRoute } from "./hold-route";
import { shiftsSince, type ShiftPlace } from "./layout-shifts";
import { waitForAnswers } from "../network";

// What stands in a place until its answer comes, against what replaces it
// ("No layout shift" and "No flash of the wrong state" in coding-standards.md).
// The journeys, the scans and the screenshots wait for the answer, so they
// never see it: these helpers hold the answer back, measure, let it through
// and measure again. A placeholder is hidden from assistive technology and a
// skeleton has no role, so both are found by structure, here and nowhere else
// (the one exception to "Selectors by role and label only").

const SESSION = "**/api/auth/session";
const DESKTOP_WIDTH = 1280;

// Every answer of /api/auth/session waits until the returned function runs.
export const holdSessionAnswer = (page: Page) => holdRoute(page, SESSION);

export interface Look {
  top: number;
  left: number;
  right: number;
  width: number;
  height: number;
  background: string;
}

export async function lookOf(locator: Locator): Promise<Look> {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      top: box.top,
      left: box.left,
      right: box.right,
      width: box.width,
      height: box.height,
      background: getComputedStyle(element).backgroundColor,
    };
  });
}

// Same height, the same right edge and the same colour as the button; at
// least as wide (it holds the wider of the two answers' buttons).
export function expectSameLook(placeholder: Look, button: Look): void {
  expect(placeholder.background).toBe(button.background);
  expect(Math.abs(placeholder.height - button.height)).toBeLessThan(0.5);
  expect(Math.abs(placeholder.right - button.right)).toBeLessThan(0.5);
  expect(placeholder.width).toBeGreaterThanOrEqual(button.width - 0.5);
}

// The navbar's own placeholder is the button-like child of its wrapper.
export const navbarPlaceholder = (page: Page) =>
  page.getByRole("banner").locator('span[aria-hidden="true"] > span').first();

// The placeholder of a homepage action is the sibling of the cells of its two
// answers, found from the guest's link, which is in the page but unseen until
// the answer.
export const actionPlaceholder = (guestLink: Locator) =>
  guestLink.locator(
    'xpath=ancestor::div[span[@aria-hidden="true"]][1]/span[@aria-hidden="true"]',
  );

/** The spinner in a homepage button whose page is on its way. */
export const linkSpinner = (link: Locator) =>
  link.locator('span[aria-hidden="true"] > span');

/** The bar of the mobile menu's last row, in place of "Sign In". */
export const menuRowPlaceholder = (menu: Locator) =>
  menu.locator('span[aria-hidden="true"]').first();

/** The placeholder of the top bar's create button, as wide as the screen asks. */
export const newItemPlaceholder = (page: Page) =>
  page
    .getByRole("banner")
    .locator('span[aria-hidden="true"] > span')
    .filter({ visible: true })
    .first();

/** The box of a skeleton inside the root, when there is one. */
export const skeletonIn = (root: Locator) => root.locator(SKELETON).first();

export interface InPlace extends CompareOptions {
  /** What is measured in both states. */
  root: Locator;
  release: ReleaseReads;
  /** What is on screen only once the answer has come. */
  settled: Locator;
  /** What is on screen only in the state that is meant, when two look alike. */
  held?: Locator;
  /**
   * From when no node may move: the click of a soft navigation
   * (`performance.now()` in the page), or the start of the document.
   */
  since?: number;
  /**
   * Named exceptions: the footer follows a list whose length is not known, the
   * Upgrade button joins the top bar for a Free user, and the content of a note
   * grows when the Markdown parser has loaded.
   */
  mayShift?: ("footer" | "top bar" | "content")[];
}

// The boxes of the loading state. The state itself is proved first: a hold that
// did not hold would compare the page with itself.
export async function measureHeld(
  page: Page,
  root: Locator,
): Promise<Map<ResolvedTheme, Block>> {
  const skeletons = root.locator(SKELETON);
  await expect(skeletons.first()).toBeVisible();
  // The stream has brought the state as far as it goes while held.
  let count = -1;
  await expect
    .poll(
      async () => {
        const last = count;
        count = await skeletons.count();
        return count === last;
      },
      { intervals: [300] },
    )
    .toBe(true);
  await waitForAnimations(page);
  const before = await measureThemes(page, root);
  for (const block of before.values()) expect(hasBar(block)).toBe(true);
  return before;
}

// The one call of a loading state that the page has been opened into: it is on
// screen, its blocks stand where the blocks stand that replace it, in both
// themes, and nothing on the page moves when they come.
export async function expectInPlace(
  page: Page,
  {
    root,
    release,
    settled,
    held,
    since = 0,
    mayShift = [],
    ...options
  }: InPlace,
): Promise<void> {
  await expect(settled).toBeHidden();
  if (held) await expect(held).toBeVisible();
  const before = await measureHeld(page, root);

  // What a screen reader and the contrast are told while the page loads, once
  // per case: on the desktop, since the phone shows the same nodes.
  if ((page.viewportSize()?.width ?? 0) >= DESKTOP_WIDTH) {
    await expectNoSeriousViolations(page);
  }

  await release();
  await expect(settled).toBeVisible();
  await waitForAnswers(page);
  const after = await measureSettled(page, root);
  const shifts = await shiftsSince(page, since);

  expectSameBlocks(page, before, after, options);
  const allowed = new Set<ShiftPlace>(mayShift);
  expect
    .soft(
      shifts.filter(
        ({ places }) =>
          places.length === 0 || places.some((place) => !allowed.has(place)),
      ),
      `the layout shifts of ${page.url()}`,
    )
    .toEqual([]);
}
