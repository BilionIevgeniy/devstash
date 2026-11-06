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
      <header>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your developer knowledge hub</p>
      </header>
      <StatsSkeleton />
      <CollectionsSkeleton />
      <ItemsSkeleton rows={PINNED_SKELETON_ROWS} />
      <ItemsSkeleton rows={RECENT_SKELETON_ROWS} />
    </div>
  );
}
