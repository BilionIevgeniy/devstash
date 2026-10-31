"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/ErrorState";
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
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      description="This page could not be loaded. Check your connection and try again."
    >
      <Button onClick={retry}>Try again</Button>
    </ErrorState>
  );
}
