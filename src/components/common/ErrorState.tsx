import type { ReactNode } from "react";

interface ErrorStateProps {
  title: ReactNode;
  description: ReactNode;
  /**
   * The line that names the digest of a server error (what to quote, and what
   * finds it in Sentry), worded by the caller: the root error pages have no
   * messages and say it in both languages.
   */
  reference?: ReactNode;
  /** Buttons or links that lead out: Try again, Go to the homepage. */
  children?: ReactNode;
}

// A centred message for a page that could not be shown: an error boundary or
// a missing page.
export function ErrorState({
  title,
  description,
  reference,
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        {reference && (
          <p className="text-muted-foreground text-sm">{reference}</p>
        )}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
