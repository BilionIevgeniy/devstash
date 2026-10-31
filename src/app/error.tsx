"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";

// Catches what the segments below do not: the app layout (its sidebar) and the
// auth pages. Rendered inside the root layout, so the theme and toasts stay.
export default function RootError({
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
    <main className="flex flex-1 items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description="This page could not be loaded. Please try again."
      >
        <Button onClick={retry}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to the dashboard</Link>
        </Button>
      </ErrorState>
    </main>
  );
}
