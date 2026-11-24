"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

import { focusOnce } from "@/components/common/focus-once";

interface InPageLinkProps extends Omit<
  ComponentProps<typeof Link>,
  "href" | "onClick"
> {
  /** The page's own path may come before the hash. */
  href: string;
}

// A link to a part of the page it is on. Not a plain anchor: that pushes a
// history entry the router does not know, and Back onto it would change the URL
// alone. The router scrolls but leaves the focus where it was, so the next Tab
// would jump back up: the focus goes along here.
export function InPageLink({ href, ...props }: InPageLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const target = document.getElementById(href.slice(href.indexOf("#") + 1));
    if (target) focusOnce(target, { preventScroll: true });
  }

  return <Link {...props} href={href} onClick={handleClick} />;
}
