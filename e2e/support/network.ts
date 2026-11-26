import type { BrowserContext, Page, Request } from "@playwright/test";
import { expect } from "@playwright/test";

// What a test means by a quiet network: no request of the context still waits
// for its answer, for QUIET_MS. Not `networkidle`: since Cache Components
// (ADR 0037), Chromium reports some prefetches as unfinished after their last
// byte has arrived, so `networkidle` may never come. A sign-out needs only the
// answers in: the session cookie comes with the headers.
const QUIET_MS = 500;

interface Waiting {
  requests: Set<Request>;
  changedAt: number;
}

const contexts = new WeakMap<BrowserContext, Waiting>();

// Called once per test by the fixture of support/test.ts.
export function trackAnswers(context: BrowserContext): void {
  const waiting: Waiting = { requests: new Set(), changedAt: Date.now() };
  contexts.set(context, waiting);
  const settle = (request: Request) => {
    waiting.requests.delete(request);
    waiting.changedAt = Date.now();
  };
  context.on("request", (request) => {
    waiting.requests.add(request);
    waiting.changedAt = Date.now();
  });
  context.on("response", (response) => settle(response.request()));
  context.on("requestfailed", settle);
  // A request of a page that closed mid-flight never settles: it goes with
  // its page, so it cannot hold every later wait of the test.
  context.on("page", (page) => {
    page.on("close", () => {
      for (const request of waiting.requests) {
        if (pageOf(request) === page) settle(request);
      }
    });
  });
}

function pageOf(request: Request): Page | null {
  try {
    return request.frame().page();
  } catch {
    // A service worker's request has no frame.
    return null;
  }
}

export function waitForAnswers(page: Page): Promise<void> {
  return waitForContextAnswers(page.context());
}

export async function waitForContextAnswers(
  context: BrowserContext,
): Promise<void> {
  const waiting = contexts.get(context);
  if (!waiting) throw new Error("The context is not tracked: use support/test");
  await expect
    .poll(
      () =>
        waiting.requests.size === 0 &&
        Date.now() - waiting.changedAt >= QUIET_MS,
      { intervals: [100] },
    )
    .toBe(true);
}
