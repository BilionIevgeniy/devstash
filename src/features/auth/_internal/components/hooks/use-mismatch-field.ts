import { useEffect, useId, useRef } from "react";

import type { ErrorRef } from "@/i18n/error-codes";

// Two passwords that differ are found in the browser: the second field is
// marked, described by the form's error, which stands right under it, and
// takes the focus. `errorId` goes on that error.
export function useMismatchField(error: ErrorRef | null) {
  const errorId = useId();
  const ref = useRef<HTMLInputElement>(null);
  const isMismatch = error?.error === "passwordsDoNotMatch";

  useEffect(() => {
    if (isMismatch) ref.current?.focus();
  }, [isMismatch]);

  return {
    errorId,
    fieldProps: {
      ref,
      ...(isMismatch && {
        "aria-invalid": true as const,
        "aria-describedby": errorId,
      }),
    },
  };
}
