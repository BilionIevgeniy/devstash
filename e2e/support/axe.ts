import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// The WCAG 2.2 A and AA rules. Only serious and critical violations fail a
// scan (spec 21); a moderate one is a finding for the review, not a red test.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const FAILING_IMPACTS = new Set(["serious", "critical"]);

// axe reads the screen as it is: a sheet still sliding in has a lower
// contrast than the one that lands. Waits until every finite animation has
// finished (a skeleton's endless pulse never does, so it does not count).
export async function waitForAnimations(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.effect?.getComputedTiming().iterations !== Infinity,
            ).length,
      ),
    )
    .toBe(0);
}

export async function expectNoSeriousViolations(page: Page): Promise<void> {
  await waitForAnimations(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  const failing = violations
    .filter((violation) => FAILING_IMPACTS.has(violation.impact ?? ""))
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
  expect(failing, `axe on ${page.url()}`).toEqual([]);
}
