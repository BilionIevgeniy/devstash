import { useEffect, useState } from "react";
import { useRemountOnReveal } from "@/components/common/hooks/use-remount-on-reveal";

// A key that changes when the page shows again: from the browser's
// back/forward cache (Back from Stripe), or as a route Next.js kept mounted
// but hidden (Back within the app, ADR 0037). Keyed by it, the checkout UI mounts
// fresh: the pending redirect ends, the order dialog is closed and its consent
// boxes are clear, since a consent must never come back ticked (ADR 0032).
export function usePageRestoreKey(): string {
  const revealKey = useRemountOnReveal();
  const [key, setKey] = useState(0);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setKey((current) => current + 1);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return `${key}-${revealKey}`;
}
