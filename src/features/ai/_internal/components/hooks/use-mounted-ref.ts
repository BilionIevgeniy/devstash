import { useEffect, useRef } from "react";

// Whether the component is still on the screen. A Server Action cannot be
// aborted, so an AI answer can arrive after its form closed: the caller reads
// this and drops the answer, without a toast for a form that is gone.
export function useMountedRef() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}
