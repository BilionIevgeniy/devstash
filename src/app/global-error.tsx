"use client";

import { BilingualErrorText } from "@/components/common/bilingual/BilingualErrorText";
import { ErrorState } from "@/components/common/ErrorState";
import { useReportError } from "@/components/common/hooks/use-report-error";
import { ThemeSync } from "@/components/common/theme/ThemeSync";
import { Button } from "@/components/ui/button";
import "./globals.css";

// Replaces the root layout when that layout fails, so it brings its own
// document and styles. It is always rendered in the browser, into an empty
// document of Next's (no inline script runs there), so ThemeSync puts the
// visitor's theme on <html> before the paint; `dark` is the start, as in the
// root layout.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest = useReportError(
    error,
    "The root layout failed to render in the browser",
  );

  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center p-6">
        <ThemeSync />
        <title>
          Something went wrong · Etwas ist schiefgelaufen · DevStash
        </title>
        <ErrorState
          title={<BilingualErrorText part="title" />}
          description={<BilingualErrorText part="description" whole />}
          reference={
            digest && <BilingualErrorText part="reference" digest={digest} />
          }
        >
          <Button onClick={retry}>
            <BilingualErrorText part="retry" />
          </Button>
        </ErrorState>
      </body>
    </html>
  );
}
