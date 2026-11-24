import { LIST_ROW_HEIGHT } from "@/app/(app)/_components/ListRow";
import { LIST_ROW_ACTIONS_WIDTH } from "@/app/(app)/_components/ListRowFrame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ListRowSkeletonProps {
  /** A row of /favorites also shows the badge of its type. */
  badge?: boolean;
}

export function ListRowSkeleton({ badge = false }: ListRowSkeletonProps) {
  return (
    <div className={cn("flex", LIST_ROW_HEIGHT)}>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
        <Skeleton className="size-4 shrink-0" />
        <Skeleton className="h-4 flex-1" />
        {badge && (
          <Skeleton className="hidden h-5 w-16 shrink-0 rounded-4xl sm:block" />
        )}
        <Skeleton className="h-4 w-14 shrink-0" />
      </div>
      <div className={LIST_ROW_ACTIONS_WIDTH} />
    </div>
  );
}
