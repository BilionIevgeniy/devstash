"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import "./globals.css";

// Replaces the root layout when that layout fails, so it brings its own
// document, styles and the dark theme the root layout would have set.
export default function GlobalError({
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
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center p-6">
        <title>Something went wrong · DevStash</title>
        <ErrorState
          title="Something went wrong"
          description="DevStash could not be loaded. Please try again."
        >
          <Button onClick={retry}>Try again</Button>
        </ErrorState>
      </body>
    </html>
  );
}
