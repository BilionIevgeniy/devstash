"use client";

import Link from "next/link";
import { BilingualErrorText } from "@/components/common/BilingualErrorText";

import { ErrorState } from "@/components/common/ErrorState";
import { useReportError } from "@/components/common/hooks/use-report-error";
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
  const digest = useReportError(
    error,
    "A page outside the app shell failed to render in the browser",
  );

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ErrorState
        title={<BilingualErrorText part="title" />}
        description={<BilingualErrorText part="description" />}
        reference={
          digest && <BilingualErrorText part="reference" digest={digest} />
        }
      >
        <Button onClick={retry}>
          <BilingualErrorText part="retry" />
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <BilingualErrorText part="home" />
          </Link>
        </Button>
      </ErrorState>
    </main>
  );
}
