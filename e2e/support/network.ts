import type { BrowserContext, Page, Request } from "@playwright/test";
import { expect } from "@playwright/test";

// What a test means by a quiet network: no request of the context still waits
// for its answer, for QUIET_MS. Not `networkidle`: since Partial Prefetching
// (ADR 0037), Chromium reports some prefetches as unfinished after their last
// byte has arrived, so `networkidle` never comes. A sign-out needs only the
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
}

export async function waitForAnswers(page: Page): Promise<void> {
  const waiting = contexts.get(page.context());
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
