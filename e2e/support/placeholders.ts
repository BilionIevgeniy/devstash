import { expect, type Locator, type Page, type Route } from "@playwright/test";
import {
  compareBlocks,
  hasBar,
  type Block,
  type CompareOptions,
} from "../../scripts/block-layout";
import type { ResolvedTheme } from "../../src/lib/theme";
import { waitForAnimations } from "./axe";
import type { ReleaseReads } from "./hold-reads";
import { waitForAnswers } from "./network";
import { PAINTED_THEMES } from "./theme";

// What stands in a place until its answer comes, against what replaces it
// ("No layout shift" and "No flash of the wrong state" in coding-standards.md).
// The journeys, the scans and the screenshots wait for the answer, so they
// never see it: these helpers hold the answer back, measure, let it through
// and measure again. A placeholder is hidden from assistive technology and a
// skeleton has no role, so both are found by structure, here and nowhere else
// (the one exception to "Selectors by role and label only").

const SESSION = "**/api/auth/session";
const SKELETON = '[data-slot="skeleton"]';

// Every answer of /api/auth/session waits until the returned function runs;
// one asked for after that goes through at once. The handler stays: a route
// it caught and never continued would hang even after an unroute.
export async function holdSessionAnswer(
  page: Page,
): Promise<() => Promise<void>> {
  const held: Route[] = [];
  let released = false;
  await page.route(SESSION, async (route) => {
    if (released) await route.continue();
    else held.push(route);
  });
  return async () => {
    await expect.poll(() => held.length).toBeGreaterThan(0);
    released = true;
    await Promise.all(held.map((route) => route.continue()));
  };
}

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

// The rendered boxes under the root, down to the skeleton bars. React's
// streaming markers and what is hidden or a single pixel (a focus target, text
// for a screen reader) have no box.
async function measureBlocks(root: Locator): Promise<Block> {
  return root.evaluate((element, skeleton) => {
    interface Measured {
      name: string;
      bar: boolean;
      top: number;
      bottom: number;
      left: number;
      right: number;
      children: Measured[];
    }
    const SKIPPED = new Set(["TEMPLATE", "SCRIPT", "STYLE"]);
    // A line of text, its icon or its control included, is one block.
    const isText = (node: Element) =>
      node.tagName === "svg" ||
      [...node.childNodes].some(
        (child) =>
          child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
      );
    const measure = (node: Element): Measured[] => {
      if (SKIPPED.has(node.tagName)) return [];
      const style = getComputedStyle(node);
      const inner = () => [...node.children].flatMap(measure);
      if (style.display === "contents") return inner();
      const box = node.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) return [];
      const bar = node.matches(skeleton);
      return [
        {
          name: node.tagName.toLowerCase(),
          bar,
          top: box.top,
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          children: bar || isText(node) ? [] : inner(),
        },
      ];
    };
    const [measured] = measure(element);
    if (!measured) throw new Error("The measured root has no box");
    const number = (block: Measured) =>
      block.children.forEach((child, index) => {
        child.name = `${child.name}:${index + 1}`;
        number(child);
      });
    number(measured);
    return measured;
  }, SKELETON);
}

// The boxes do not depend on the theme, so the painted theme is switched on
// the page that is there instead of loading it once more (ADR 0039).
export async function measureThemes(
  page: Page,
  root: Locator,
): Promise<Map<ResolvedTheme, Block>> {
  const blocks = new Map<ResolvedTheme, Block>();
  const painted = await page.evaluate(() => document.documentElement.className);
  for (const theme of PAINTED_THEMES) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    blocks.set(theme, await measureBlocks(root));
  }
  await page.evaluate((classes) => {
    document.documentElement.className = classes;
  }, painted);
  return blocks;
}

export function expectSameBlocks(
  page: Page,
  before: Map<ResolvedTheme, Block>,
  after: Map<ResolvedTheme, Block>,
  options: CompareOptions = {},
): void {
  for (const theme of PAINTED_THEMES) {
    expect
      .soft(
        compareBlocks(before.get(theme)!, after.get(theme)!, options),
        `the blocks of ${page.url()} in ${theme}`,
      )
      .toEqual([]);
  }
}

// Where a moved node sits. A case cannot excuse "unknown".
type ShiftPlace = "top bar" | "footer" | "content" | "unknown";

interface Shift {
  at: number;
  value: number;
  places: ShiftPlace[];
  /** What moved, for the message. */
  nodes: string[];
}

// Records every layout shift of the pages the test opens, also one within
// 500 ms of a click, which the CLS metric leaves out. It reports nodes that
// stay and move: a skeleton replaced by new nodes is proved by its boxes.
export async function trackLayoutShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const shifts: unknown[] = [];
    Object.assign(window, { __shifts: shifts });
    const placeOf = (node: Node | null) => {
      const element = node instanceof Element ? node : node?.parentElement;
      if (!element?.isConnected) return "unknown";
      if (element.closest("footer")) return "footer";
      if (element.closest("header") && !element.closest("main"))
        return "top bar";
      return "content";
    };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const { value, startTime, sources } = entry as PerformanceEntry & {
          value: number;
          sources: { node: Node | null }[];
        };
        shifts.push({
          at: startTime,
          value,
          places: sources.map(({ node }) => placeOf(node)),
          nodes: sources.map(({ node }) =>
            node instanceof Element ? node.outerHTML.slice(0, 120) : "gone",
          ),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

const now = (page: Page) => page.evaluate(() => performance.now());

async function shiftsSince(page: Page, start: number): Promise<Shift[]> {
  const shifts = await page.evaluate(
    () => (window as unknown as { __shifts: Shift[] }).__shifts,
  );
  return shifts.filter(({ at }) => at >= start);
}

export interface InPlace extends CompareOptions {
  /** What is measured in both states. */
  root: Locator;
  release: ReleaseReads;
  /** What is on screen only once the answer has come. */
  settled: Locator;
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
  { root, release, settled, mayShift = [], ...options }: InPlace,
): Promise<void> {
  await expect(settled).toBeHidden();
  const before = await measureHeld(page, root);
  const skeletons = root.locator(SKELETON);

  const start = await now(page);
  await release();
  await expect(settled).toBeVisible();
  await expect(skeletons).toHaveCount(0);
  await waitForAnswers(page);
  await page.evaluate(() => document.fonts.ready);
  await waitForAnimations(page);
  const shifts = await shiftsSince(page, start);
  const after = await measureThemes(page, root);

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
