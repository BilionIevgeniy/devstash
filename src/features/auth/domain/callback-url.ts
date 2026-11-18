import { DASHBOARD_PATH, SIGN_IN_PATH } from "./auth-paths";

// One leading slash, so `//host` is out, and printable ASCII with no backslash,
// which browsers read as a slash. The proxy percent-encodes real paths, and
// anything above U+00FF would make the redirect header itself throw.
const INTERNAL_PATH = /^\/(?!\/)[\x21-\x5b\x5d-\x7e]*$/;

// The value comes from the URL or a form field, so it is never trusted: only a
// path on this site is followed.
export function safeCallbackPath(value: unknown): string {
  return typeof value === "string" && INTERNAL_PATH.test(value)
    ? value
    : DASHBOARD_PATH;
}

// The sign-in page that leads on to the path afterwards; the default path
// needs no parameter.
export function signInHref(callbackPath: string): string {
  if (callbackPath === DASHBOARD_PATH) return SIGN_IN_PATH;
  return `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackPath)}`;
}
