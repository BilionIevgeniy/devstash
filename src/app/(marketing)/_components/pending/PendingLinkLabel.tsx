"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PendingSpinner } from "./PendingSpinner";

// The label of a button that is a link to the app or the auth pages. Their
// shell is not prefetched (the layout reads the request, ADR 0037), so a click
// shows nothing until the server has answered: meanwhile the label gives way to
// a spinner, after a moment, so a fast answer shows none. Both sit in one cell,
// so the button keeps its size, and the label stays in the page, unseen, as the
// link's name.
export function PendingLinkLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span className="grid">
      <span
        className={cn(
          "col-start-1 row-start-1 transition-opacity",
          pending && "opacity-0 delay-100",
        )}
      >
        {children}
      </span>
      {pending && (
        <span
          aria-hidden="true"
          className="col-start-1 row-start-1 flex items-center justify-center"
        >
          <PendingSpinner soon />
        </span>
      )}
    </span>
  );
}
