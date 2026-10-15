import { Suspense } from "react";

import {
  CollectionsSkeleton,
  ItemsSkeleton,
  StatsSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import { PinnedItems } from "@/components/dashboard/PinnedItems";
import { RecentCollections } from "@/components/dashboard/RecentCollections";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { StatsCards } from "@/components/dashboard/StatsCards";

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
