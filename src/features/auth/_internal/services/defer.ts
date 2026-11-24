import "server-only";

import { logger } from "@/lib/observability/logger";

/** Runs a task once the answer has been sent: `after` of the entry point. */
export type Defer = (task: () => Promise<void>) => void;

// Work that only one kind of address needs (a lookup, a token, an email) runs
// after the answer: the same words for every address are worth little when the
// time they take tells the addresses apart. Nobody waits for it, so a failure
// is logged here.
export function deferLogged(defer: Defer, task: () => Promise<unknown>): void {
  defer(async () => {
    try {
      await task();
    } catch (error) {
      await logger.error("Sending an email after the answer failed", { error });
    }
  });
}
