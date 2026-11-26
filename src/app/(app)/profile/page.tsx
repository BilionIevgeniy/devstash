import { titleOf } from "@/app/page-title";
import { PageHeader } from "@/app/(app)/_components/PageHeader";
import { Suspense } from "react";

import { ProfileInfo } from "@/app/(app)/profile/_components/ProfileInfo";
import {
  ProfileInfoSkeleton,
  UsageStatsSkeleton,
} from "@/app/(app)/profile/_components/ProfileSkeletons";
import { UsageStats } from "@/app/(app)/profile/_components/UsageStats";

export const generateMetadata = titleOf("pages.profile");

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader namespace="pages.profile" />
      <Suspense fallback={<ProfileInfoSkeleton />}>
        <ProfileInfo />
      </Suspense>
      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStats />
      </Suspense>
    </div>
  );
}
