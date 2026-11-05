import { useEffect, useState } from "react";

import { fetchHasSession } from "@/features/auth/_internal/components/fetch-has-session";

// For a page that stays static: it renders as a guest and learns of the session
// after mount. Only for what the visitor sees, never for access. Aborted on
// unmount; an abort is not a failure, and a failure leaves the guest view.
export function useHasSession(): boolean {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchHasSession(controller.signal)
      .then(setHasSession)
      .catch(() => {
        if (!controller.signal.aborted) setHasSession(false);
      });

    return () => controller.abort();
  }, []);

  return hasSession;
}
