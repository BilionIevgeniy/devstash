import { expect, test as base } from "@playwright/test";
import { holdReads, type HeldTable, type ReleaseReads } from "./hold-reads";
import { trackAnswers } from "./network";

// Every spec imports `test` and `expect` from here, never from
// @playwright/test (a lint rule says so). The one automatic fixture fails a
// test on any Content-Security-Policy violation, enforced or report-only, on
// any page of its context (ADR 0036): a policy that blocks a part of the app
// shows here. It also tracks the answers of the context for waitForAnswers
// (support/network.ts). `holdReads` holds the server's answer back
// (support/hold-reads.ts) and releases what the test did not, also after a
// timeout, so no lock outlives its test.
const CSP_MESSAGE = /Content Security Policy/i;

interface Fixtures {
  cspGuard: void;
  holdReads: (...tables: HeldTable[]) => Promise<ReleaseReads>;
}

export const test = base.extend<Fixtures>({
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
  holdReads: async ({ context }, provide) => {
    const held: ReleaseReads[] = [];
    await provide(async (...tables) => {
      const release = await holdReads(context, ...tables);
      held.push(release);
      return release;
    });
    for (const release of held) await release();
  },
});

export { expect };
