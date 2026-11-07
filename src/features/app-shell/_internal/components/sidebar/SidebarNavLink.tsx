"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  type ActiveMatch,
  isActivePath,
} from "@/features/app-shell/domain/active-link";

interface SidebarNavLinkProps extends ComponentProps<typeof Link> {
  href: string;
  /** Leave out for a link that never stands for the page on screen. */
  match?: ActiveMatch;
}

// The sections stay server components: only this link reads the path, and the
// style of the current page comes from `aria-current` in the link's classes.
export function SidebarNavLink({ href, match, ...props }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isCurrent = match !== undefined && isActivePath(pathname, href, match);

  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      {...props}
    />
  );
}
