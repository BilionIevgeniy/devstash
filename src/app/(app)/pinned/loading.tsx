import { PinnedGroupSkeleton } from "@/app/(app)/pinned/_components/PinnedGroupSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

const GROUP_ROWS = [4, 3, 2];

// The number of pins is not known yet: a user with fewer rows sees the list end
// early.
export default function PinnedLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-1 h-6 w-56" />
      </header>
      {GROUP_ROWS.map((rows, index) => (
        <PinnedGroupSkeleton key={index} rows={rows} />
      ))}
    </div>
  );
}
