import { useEffect } from "react";

// Tells the dialog above that the body's request runs, and that it does not
// once the body is gone.
export function useReportPending(
  isPending: boolean,
  onPendingChange: (isPending: boolean) => void,
) {
  useEffect(() => {
    onPendingChange(isPending);
    return () => onPendingChange(false);
  }, [isPending, onPendingChange]);
}
