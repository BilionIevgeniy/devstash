import { expect, type Locator, type Page } from "@playwright/test";
import {
  compareBlocks,
  type Block,
  type CompareOptions,
} from "../../../scripts/block-layout";
import type { ResolvedTheme } from "../../../src/lib/theme";
import { waitForAnimations } from "../axe";
import { PAINTED_THEMES } from "../theme";

// The boxes of what is on screen, for scripts/block-layout.ts to compare.

/** A skeleton has no role, so it is found by its slot, here and nowhere else. */
export const SKELETON = '[data-slot="skeleton"]';

// The rendered boxes under the root, down to the skeleton bars. React's
// streaming markers and what is hidden or a single pixel (a focus target, text
// for a screen reader) have no box.
async function measureBlocks(root: Locator): Promise<Block> {
  return root.evaluate((element, skeleton) => {
    interface Measured {
      name: string;
      bar: boolean;
      framed: boolean;
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
          framed:
            parseFloat(style.borderTopWidth) > 0 ||
            !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(style.backgroundColor),
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
// Settled for a measurement: the skeletons gone, the fonts in, nothing moving.
export async function measureSettled(
  page: Page,
  root: Locator,
): Promise<Map<ResolvedTheme, Block>> {
  await expect(root.locator(SKELETON)).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await waitForAnimations(page);
  return measureThemes(page, root);
}

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
