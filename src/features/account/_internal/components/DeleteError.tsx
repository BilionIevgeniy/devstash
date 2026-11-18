"use client";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import type { ErrorRef } from "@/i18n/error-codes";

export function DeleteError({ error }: { error: ErrorRef }) {
  const errorText = useErrorText();
  return (
    <p role="alert" className="text-sm text-destructive">
      {errorText(error)}
    </p>
  );
}
