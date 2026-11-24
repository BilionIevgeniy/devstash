import { ListRowSkeleton } from "@/app/(app)/_components/ListRowSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Shared with PinnedGroup, so the title does not move when the content commits.
// Here and not there: loading.tsx renders on the server, and PinnedGroup holds
// client code.
export const PINNED_GROUP_HEADER =
  "flex h-8 items-center justify-between gap-3";

// The row of the one sort above the groups, shared with loading.tsx the same
// way.
export const PINNED_SORT_ROW = "flex h-8 justify-end";

interface PinnedGroupSkeletonProps {
  rows: number;
}

export function PinnedGroupSkeleton({ rows }: PinnedGroupSkeletonProps) {
  return (
    <section className="space-y-2">
      <div className={PINNED_GROUP_HEADER}>
        <Skeleton className="h-5 w-28" />
      </div>
      <div>
        {Array.from({ length: rows }, (_, index) => (
          <ListRowSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
