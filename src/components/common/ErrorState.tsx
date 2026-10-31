import type { ReactNode } from "react";

interface ErrorStateProps {
  title: string;
  description: string;
  /** Buttons or links that lead out: Try again, Go to the dashboard. */
  children?: ReactNode;
}

// A centred message for a page that could not be shown: an error boundary or
// a missing page.
export function ErrorState({ title, description, children }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
