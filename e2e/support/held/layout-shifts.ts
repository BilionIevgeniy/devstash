import type { Page } from "@playwright/test";

// What moved on the pages of a test, and where.

// Where a moved node sits. A case cannot excuse "unknown".
export type ShiftPlace = "top bar" | "footer" | "content" | "unknown";

export interface Shift {
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

export const now = (page: Page) => page.evaluate(() => performance.now());

export async function shiftsSince(page: Page, start: number): Promise<Shift[]> {
  const shifts = await page.evaluate(
    () => (window as unknown as { __shifts: Shift[] }).__shifts,
  );
  return shifts.filter(({ at }) => at >= start);
}
