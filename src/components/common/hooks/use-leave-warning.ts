import { useEffect } from "react";

// While `active`, a reload or a closed tab asks first: the browser shows its
// own question, since it ignores any text a page gives.
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
