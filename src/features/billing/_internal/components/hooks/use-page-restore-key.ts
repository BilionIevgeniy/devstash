import { useEffect, useState } from "react";

// A key that changes when the browser shows the page again from its
// back/forward cache (Back from Stripe). Keyed by it, the checkout UI mounts
// fresh: the pending redirect ends, the order dialog is closed and its consent
// boxes are clear, since a consent must never come back ticked (ADR 0032).
export function usePageRestoreKey(): number {
  const [key, setKey] = useState(0);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setKey((current) => current + 1);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return key;
}
