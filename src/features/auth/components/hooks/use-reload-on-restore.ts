import { useEffect } from "react";

// A browser may keep a whole document in its back-forward cache and restore
// it on Back, routes and data included, after the session in it has ended
// (leaveSession drops only the routes Next keeps hidden, ADR 0037). The app's
// pages are sent with no-store, which most browsers do not keep, but that is
// theirs to decide: a page restored from that cache loads again, so the
// server sees the request and sends a visitor whose session ended to sign-in.
export function useReloadOnRestore(): void {
  useEffect(() => {
    function reloadIfRestored(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", reloadIfRestored);
    return () => window.removeEventListener("pageshow", reloadIfRestored);
  }, []);
}
