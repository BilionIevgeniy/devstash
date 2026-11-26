import { PageHeader } from "@/app/(app)/_components/PageHeader";
import { SORT_SELECT_WIDTH } from "@/app/(app)/_components/SortSelect";
import {
  PINNED_SORT_ROW,
  PinnedGroupSkeleton,
} from "@/app/(app)/pinned/_components/PinnedGroupSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GROUP_ROWS = [4, 3, 2];

// The number of pins is not known yet: a user with fewer rows sees the list end
// early.
export default function PinnedLoading() {
  return (
    <div className="space-y-8">
      <PageHeader namespace="pages.pinned" />
      <div className="space-y-8">
        <div className={PINNED_SORT_ROW}>
          <Skeleton className={cn(SORT_SELECT_WIDTH, "h-8 max-md:h-11")} />
        </div>
        {GROUP_ROWS.map((rows, index) => (
          <PinnedGroupSkeleton key={index} rows={rows} />
        ))}
      </div>
    </div>
  );
}
