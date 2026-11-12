import { LIST_ROW_HEIGHT } from "@/app/(app)/_components/ListRow";
import { LIST_ROW_ACTIONS_WIDTH } from "@/app/(app)/_components/ListRowFrame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
          <div key={index} className={cn("flex", LIST_ROW_HEIGHT)}>
            <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-14 shrink-0" />
            </div>
            <div className={LIST_ROW_ACTIONS_WIDTH} />
          </div>
        ))}
      </div>
    </section>
  );
}
