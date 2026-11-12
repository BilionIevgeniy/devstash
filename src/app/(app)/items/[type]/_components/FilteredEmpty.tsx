import Link from "next/link";

import { LinkPendingMark } from "@/components/common/LinkPendingMark";
import { buttonVariants } from "@/components/ui/button";

interface FilteredEmptyProps {
  clearHref: string;
}

// A filter that matches nothing, for example a shared link with a tag the
// viewer does not have. Clearing drops the tag and keeps the sort.
export function FilteredEmpty({ clearHref }: FilteredEmptyProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">
        No items match these filters.
      </p>
      <Link
        href={clearHref}
        replace
        scroll={false}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Clear filters
        <LinkPendingMark />
      </Link>
    </div>
  );
}
