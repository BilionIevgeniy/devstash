import { expect, test as base } from "@playwright/test";
import { trackAnswers } from "./network";

// Every spec imports `test` and `expect` from here, never from
// @playwright/test (a lint rule says so). The one fixture fails a test on any
// Content-Security-Policy violation, enforced or report-only, on any page of
// its context (ADR 0036): a policy that blocks a part of the app shows here.
// It also tracks the answers of the context for waitForAnswers
// (support/network.ts).
const CSP_MESSAGE = /Content Security Policy/i;

export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [
    async ({ context }, use) => {
      trackAnswers(context);
      const violations: string[] = [];
      context.on("console", (message) => {
        if (CSP_MESSAGE.test(message.text())) violations.push(message.text());
      });
      await use();
      expect(violations, "Content-Security-Policy violations").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
