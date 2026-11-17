import { unstable_rethrow } from "next/navigation";

// A Server Action that redirects (a session that ended) rejects its promise in
// the browser with Next's redirect error, after the router has already started
// the navigation itself. A catch around the call checks this first and returns
// before its error toast and its rollback: the failure is not one.
// `unstable_rethrow` throws exactly for those errors (also when one is the
// `cause`), so it is the detector. Not marked server-only or client-only:
// `next/navigation` loads the right one for each side.
export function isNavigationError(error: unknown): boolean {
  try {
    unstable_rethrow(error);
    return false;
  } catch {
    return true;
  }
}
