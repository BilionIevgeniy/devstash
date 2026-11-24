import { E2E_MANY_FAVORITES } from "../../scripts/e2e-user";
import { signInFreshUser } from "../support/fresh-user";
import { expect, test } from "../support/test";

// /favorites with 500 favorites, all 17 pages loaded (docs/performance.md,
// feature 12 left out virtualization until a profile shows a problem): the
// main-thread long tasks while the pages load, the DOM size at the end and
// the latency of a star toggled on the last row.
test.use({ storageState: { cookies: [], origins: [] } });

declare global {
  interface Window {
    __longTasks: number[];
    __events: number[];
  }
}

test("profile of /favorites with 500 rows", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await page.addInitScript(() => {
    window.__longTasks = [];
    window.__events = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__longTasks.push(entry.duration);
      }
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__events.push(entry.duration);
      }
      // Event Timing's threshold, not yet in the DOM types of TypeScript.
    }).observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
  });
  await signInFreshUser(page, "many-favorites");

  await page.goto("/favorites");
  const stars = page.getByRole("button", { name: /^Favorite Favorite / });
  await expect(stars.first()).toBeVisible();
  const started = Date.now();
  await expect(async () => {
    await page
      .getByRole("button", { name: "Load more" })
      .scrollIntoViewIfNeeded();
    await expect(stars).toHaveCount(E2E_MANY_FAVORITES, { timeout: 1_000 });
  }).toPass({ timeout: 120_000 });
  const loadAllMs = Date.now() - started;

  await page.evaluate(() => {
    window.__events = [];
  });
  // The last row is the oldest; on /favorites an unstarred row may leave.
  await stars.last().click();
  await expect
    .poll(() => page.evaluate(() => window.__events.length))
    .toBeGreaterThan(0);

  const profile = await page.evaluate(() => ({
    longTasks: window.__longTasks.length,
    longTaskTotalMs: Math.round(window.__longTasks.reduce((a, b) => a + b, 0)),
    longestTaskMs: Math.round(Math.max(0, ...window.__longTasks)),
    domNodes: document.getElementsByTagName("*").length,
    starInteractionMs: Math.round(Math.max(0, ...window.__events)),
  }));
  console.log(JSON.stringify({ loadAllMs, ...profile }, null, 2));
});
