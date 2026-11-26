import { PageHeader } from "@/app/(app)/_components/PageHeader";
import {
  CollectionsSkeleton,
  ItemsSkeleton,
  PINNED_SKELETON_ROWS,
  RECENT_SKELETON_ROWS,
  StatsSkeleton,
} from "@/app/(app)/dashboard/_components/DashboardSkeletons";

// The page waits for the plan before its own sections stream in.
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <PageHeader namespace="pages.dashboard" />
      <StatsSkeleton />
      <CollectionsSkeleton />
      <ItemsSkeleton rows={PINNED_SKELETON_ROWS} />
      <ItemsSkeleton rows={RECENT_SKELETON_ROWS} />
    </div>
  );
}
