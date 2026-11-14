"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LinkPendingMark } from "@/components/common/LinkPendingMark";
import {
  type ActiveMatch,
  isActivePath,
} from "@/features/app-shell/domain/active-link";
import { cn } from "@/lib/utils";

// While the link's navigation is pending (LinkPendingMark inside it), the link
// dims. Only after 100 ms, so a fast or prefetched navigation does not
// flicker; it clears at once, since the delay belongs to the pending state.
export const PENDING_LINK_CLASS =
  "transition-opacity has-data-pending:opacity-60 has-data-pending:delay-100";

interface SidebarNavLinkProps extends ComponentProps<typeof Link> {
  href: string;
  /** Leave out for a link that never stands for the page on screen. */
  match?: ActiveMatch;
}

// The sections stay server components: only this link reads the path, and the
// style of the current page comes from `aria-current` in the link's classes.
export function SidebarNavLink({
  href,
  match,
  className,
  children,
  ...props
}: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isCurrent = match !== undefined && isActivePath(pathname, href, match);

  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(className, PENDING_LINK_CLASS)}
      {...props}
    >
      {children}
      <LinkPendingMark />
    </Link>
  );
}
