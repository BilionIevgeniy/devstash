import type { ReactNode } from "react";

import { ListLoadError } from "@/components/common/ListLoadError";

interface ListPagesFrameProps {
  /** The rows are the old sort's, shown dimmed while the new one loads. */
  isPlaceholder: boolean;
  /** The first page of a sort the server did not render could not be read. */
  firstPageFailed: boolean;
  onRetry: () => void;
  /** The rows. */
  children: ReactNode;
  /** The button or sentinel for the next page, left out while dimmed. */
  more: ReactNode;
}

// The rows of an endless list of /favorites or a /pinned group (ADR 0025):
// dimmed with data-pending while a new sort's first page loads, and replaced
// by the error with Try again when that page fails.
export function ListPagesFrame({
  isPlaceholder,
  firstPageFailed,
  onRetry,
  children,
  more,
}: ListPagesFrameProps) {
  if (firstPageFailed) return <ListLoadError onRetry={onRetry} />;

  return (
    <div
      data-pending={isPlaceholder ? "" : undefined}
      aria-busy={isPlaceholder}
      className="transition-opacity data-pending:opacity-50"
    >
      {children}
      {!isPlaceholder && more}
    </div>
  );
}
