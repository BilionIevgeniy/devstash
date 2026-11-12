import "server-only";

import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import { logger } from "@/lib/logger";

// Auth.js catches the errors of its own flows (the adapter's reads and writes
// during a GitHub sign-in, a bad configuration) and writes them with
// console.error: the message, the stack of the cause, which starts with the
// message of a Prisma error and so can quote the arguments of the failed call,
// and the data of the cause. This replaces that writer, so these failures follow
// the rules of "Logging" in context/coding-standards.md and reach Sentry too.

// Requests that anybody on the internet can send: a bot calls an Auth.js route
// it does not serve (`UnknownAction`), posts without the CSRF cookie
// (`MissingCSRF`), replays an OAuth callback (`InvalidCheck`) or sends a session
// cookie that no longer decrypts (`JWTSessionError`), or signs in with GitHub
// when a password account already has that address (`OAuthAccountNotLinked`,
// which the sign-in page explains to the person). Auth.js refuses each one and
// answers it; nothing of ours is broken, so it is a line and no event. A broken
// configuration (`MissingSecret`, `UntrustedHost`) is not in the list: that one
// is ours to fix, so it reaches Sentry. Neither are `AccessDenied` (it also
// wraps an error thrown by our own `signIn` callback) and `OAuthCallbackError`
// (it also covers GitHub rejecting our client secret): each can hide a fault.
const REFUSED_REQUEST_TYPES: ReadonlySet<string> = new Set([
  "UnknownAction",
  "MissingCSRF",
  "InvalidCheck",
  "JWTSessionError",
  "OAuthAccountNotLinked",
]);

// The `type` of an Auth.js error is a fixed string of the package.
function typeOf(error: Error): string | undefined {
  return "type" in error && typeof error.type === "string"
    ? error.type
    : undefined;
}

// A production build minifies the class names of Auth.js, so `name` is a single
// letter ("C") and every Auth.js failure lands in one Sentry issue under that
// name. `type` survives the minifier: the copy carries it as its name.
function nameByType(error: Error): Error {
  const type = typeOf(error);
  if (type === undefined || type === error.name) return error;
  return Object.assign(new Error(), {
    name: type,
    type,
    stack: error.stack,
  });
}

// Auth.js wraps the error that was thrown in `cause.err`; that one has the
// class and the code worth reporting.
function causeOf(error: Error): unknown {
  const { cause } = error;
  return typeof cause === "object" && cause !== null && "err" in cause
    ? cause.err
    : nameByType(error);
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
    const type = typeOf(error);
    if (type !== undefined && REFUSED_REQUEST_TYPES.has(type)) {
      // The class of the error behind it tells a stale cookie from a bug in a
      // callback: Auth.js wraps every throw of the session path in
      // `JWTSessionError`.
      logger.warn(`Auth.js refused a request: ${type}`, {
        error: causeOf(error),
      });
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
