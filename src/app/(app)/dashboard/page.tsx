import { Suspense } from "react";

import {
  CollectionsSkeleton,
  ItemsSkeleton,
  PINNED_SKELETON_ROWS,
  RECENT_SKELETON_ROWS,
  StatsSkeleton,
} from "@/app/(app)/dashboard/_components/DashboardSkeletons";
import { PinnedItems } from "@/app/(app)/dashboard/_components/PinnedItems";
import { RecentCollections } from "@/app/(app)/dashboard/_components/RecentCollections";
import { RecentItems } from "@/app/(app)/dashboard/_components/RecentItems";
import { StatsCards } from "@/app/(app)/dashboard/_components/StatsCards";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";

export default async function DashboardPage() {
  const { id: userId } = await getSessionUser();
  const { isPro } = await getEntitlements(userId);

  return (
    <div className="space-y-8">
      <ItemDrawerProvider lockProItems={!isPro}>
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
      </ItemDrawerProvider>
    </div>
  );
}
