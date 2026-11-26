"use client";

import type { ReactNode } from "react";

import { usePaginationFocus } from "@/components/common/hooks/use-pagination-focus";

interface FocusKeepingNavProps {
  label: string;
  /** The page shown: its change is when the focus is checked. */
  page: number;
  className?: string;
  children: ReactNode;
}

// The <nav> of PaginationNav, which stays a server component (a page hands it
// a function for its links): the focus after a page change is all that needs
// the browser (usePaginationFocus).
export function FocusKeepingNav({
  label,
  page,
  className,
  children,
}: FocusKeepingNavProps) {
  const { navRef, onActivate } = usePaginationFocus(page);
  return (
    <nav
      ref={navRef}
      onClick={onActivate}
      aria-label={label}
      className={className}
    >
      {children}
    </nav>
  );
}
