import { Suspense } from "react";

import {
  CollectionsSkeleton,
  ItemsSkeleton,
  StatsSkeleton,
} from "@/app/(app)/dashboard/_components/DashboardSkeletons";
import { PinnedItems } from "@/app/(app)/dashboard/_components/PinnedItems";
import { RecentCollections } from "@/app/(app)/dashboard/_components/RecentCollections";
import { RecentItems } from "@/app/(app)/dashboard/_components/RecentItems";
import { StatsCards } from "@/app/(app)/dashboard/_components/StatsCards";

const PINNED_SKELETON_ROWS = 2;
const RECENT_SKELETON_ROWS = 5;

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your developer knowledge hub</p>
      </header>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>
      <Suspense fallback={<CollectionsSkeleton />}>
        <RecentCollections />
      </Suspense>
      <Suspense fallback={<ItemsSkeleton rows={PINNED_SKELETON_ROWS} />}>
        <PinnedItems />
      </Suspense>
      <Suspense fallback={<ItemsSkeleton rows={RECENT_SKELETON_ROWS} />}>
        <RecentItems />
      </Suspense>
    </div>
  );
}
