import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { LinkPendingMark } from "@/components/common/LinkPendingMark";
import { buttonVariants } from "@/components/ui/button";
import { pageHref, pageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface PageStepProps {
  href: string | null;
  label: string;
  children: ReactNode;
}

// Without a page to go to it stays in place, greyed out, so the numbers beside
// it do not move.
function PageStep({ href, label, children }: PageStepProps) {
  const className = buttonVariants({ variant: "outline", size: "sm" });

  if (href === null) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={label}
        className={cn(className, "pointer-events-none opacity-50")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
      <LinkPendingMark />
    </Link>
  );
}

interface PaginationNavProps {
  basePath: string;
  page: number;
  totalPages: number;
  // For a list with more state in its URL than the page (sort, filter): the
  // list builds its own links. Without it, `pageHref(basePath, page)`.
  hrefFor?: (page: number) => string;
}

export function PaginationNav({
  basePath,
  page,
  totalPages,
  hrefFor = (target) => pageHref(basePath, target),
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-1"
    >
      <PageStep
        href={page > 1 ? hrefFor(page - 1) : null}
        label="Previous page"
      >
        <ChevronLeft />
        <span className="hidden sm:inline">Previous</span>
      </PageStep>
      {pageNumbers(page, totalPages).map((mark, index) =>
        mark === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={mark}
            href={hrefFor(mark)}
            aria-label={`Page ${mark}`}
            aria-current={mark === page ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: mark === page ? "outline" : "ghost",
                size: "sm",
              }),
              "min-w-8",
            )}
          >
            {mark}
            <LinkPendingMark />
          </Link>
        ),
      )}
      <PageStep
        href={page < totalPages ? hrefFor(page + 1) : null}
        label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight />
      </PageStep>
    </nav>
  );
}
