import { Suspense } from "react";

import { AccountActions } from "@/app/(app)/profile/_components/AccountActions";
import { ProfileInfo } from "@/app/(app)/profile/_components/ProfileInfo";
import {
  AccountActionsSkeleton,
  ProfileInfoSkeleton,
  UsageStatsSkeleton,
} from "@/app/(app)/profile/_components/ProfileSkeletons";
import { UsageStats } from "@/app/(app)/profile/_components/UsageStats";

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Your account details and usage
        </p>
      </header>
      <Suspense fallback={<ProfileInfoSkeleton />}>
        <ProfileInfo />
      </Suspense>
      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStats />
      </Suspense>
      <Suspense fallback={<AccountActionsSkeleton />}>
        <AccountActions />
      </Suspense>
    </div>
  );
}
