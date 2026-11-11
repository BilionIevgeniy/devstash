"use client";

import { ErrorState } from "@/components/common/ErrorState";
import { useReportError } from "@/components/common/hooks/use-report-error";
import { Button } from "@/components/ui/button";

// A failed page inside the app keeps the sidebar and top bar around it. An
// error in the layout itself (the sidebar) goes up to app/error.tsx.
export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest = useReportError(
    error,
    "A page of the app failed to render in the browser",
  );

  return (
    <ErrorState
      title="Something went wrong"
      description="This page could not be loaded. Check your connection and try again."
      reference={digest}
    >
      <Button onClick={retry}>Try again</Button>
    </ErrorState>
  );
}
