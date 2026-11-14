"use client";

import { useLinkStatus } from "next/link";

// Placed inside a Link: while its navigation is pending, the mark carries
// data-pending, so the link can dim itself through `has-data-pending:`, or an
// ancestor what is about to change through `group-has-data-pending/<name>:`. Always rendered and hidden, so nothing shifts.
export function LinkPendingMark() {
  const { pending } = useLinkStatus();

  return <span hidden data-pending={pending ? "" : undefined} />;
}
