import { serverLog } from "../support/ingest";
import { test } from "../support/test";
import { waitForAnswers } from "../support/network";

// TTFB and LCP of a full load of the main app pages, and the database queries
// each load makes, median of RUNS loads on the production build (docs/
// performance.md). The query count needs Prisma's query log, switched on by
// hand for the measurement only (`log: ["query"]` in lib/postgres/prisma.ts,
// never committed): it is counted in the server's log (scripts/e2e-start.ts).
const PAGES = ["/dashboard", "/items/snippets", "/favorites", "/collections"];
const RUNS = 7;

function median(values: number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function countQueries(log: string): number {
  return log.split("\n").filter((line) => line.includes("prisma:query")).length;
}

test("lab numbers of the main app pages", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  const results: Record<string, unknown>[] = [];
  for (const path of PAGES) {
    const ttfb: number[] = [];
    const lcp: number[] = [];
    const queries: number[] = [];
    // One load first, so the instance is warm as on a busy server.
    await page.goto(path);
    await waitForAnswers(page);
    for (let run = 0; run < RUNS; run++) {
      const before = (await serverLog()).length;
      await page.goto(path);
      await waitForAnswers(page);
      const timing = await page.evaluate(
        () =>
          new Promise<{ ttfb: number; lcp: number }>((resolve) => {
            const [navigation] = performance.getEntriesByType(
              "navigation",
            ) as PerformanceNavigationTiming[];
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              resolve({
                ttfb: navigation.responseStart,
                lcp: entries[entries.length - 1].startTime,
              });
            }).observe({ type: "largest-contentful-paint", buffered: true });
          }),
      );
      ttfb.push(timing.ttfb);
      lcp.push(timing.lcp);
      queries.push(countQueries((await serverLog()).slice(before)));
    }
    results.push({
      path,
      ttfbMs: Math.round(median(ttfb)),
      lcpMs: Math.round(median(lcp)),
      queries: median(queries),
    });
  }
  console.log(JSON.stringify(results, null, 2));
});
