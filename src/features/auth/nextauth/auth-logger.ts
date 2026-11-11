import "server-only";

import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import { logger } from "@/lib/logger";

// Auth.js catches the errors of its own flows (the adapter's reads and writes
// during a GitHub sign-in, a bad configuration) and writes them with
// console.error: the message, the stack of the cause, which starts with the
// message of a Prisma error and so can quote the arguments of the failed call,
// and the data of the cause. This replaces that writer, so these failures follow
// the rules of "Logging" in context/coding-standards.md and reach Sentry too.

// Auth.js wraps the error that was thrown in `cause.err`; that one has the
// class and the code worth reporting.
function causeOf(error: Error): unknown {
  const { cause } = error;
  return typeof cause === "object" && cause !== null && "err" in cause
    ? cause.err
    : error;
}

export const authLogger: NonNullable<NextAuthConfig["logger"]> = {
  // Called synchronously from inside Auth.js, so the flush of the event cannot
  // be awaited here: the event is queued and the SDK sends it in the
  // background.
  error(error) {
    // A wrong password, an unverified address and a throttled sign-in are
    // answers to the person at the form, not failures of ours. All three
    // extend CredentialsSignin: they share its `type` but each has a `name` of
    // its own, so the class is what is checked. A line for the record, no event.
    if (error instanceof CredentialsSignin) {
      logger.warn("A sign-in was refused");
      return;
    }
    void logger.error("Auth.js reported an error", { error: causeOf(error) });
  },
  // The code is one of a closed set of strings of Auth.js.
  warn(code) {
    logger.warn(`Auth.js warning: ${code}`);
  },
  debug() {},
};
