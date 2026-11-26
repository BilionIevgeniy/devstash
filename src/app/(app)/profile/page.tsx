import { PageHeader } from "@/app/(app)/_components/PageHeader";
import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { ProfileInfo } from "@/app/(app)/profile/_components/ProfileInfo";
import {
  ProfileInfoSkeleton,
  UsageStatsSkeleton,
} from "@/app/(app)/profile/_components/ProfileSkeletons";
import { UsageStats } from "@/app/(app)/profile/_components/UsageStats";

export default function ProfilePage() {
  const t = useTranslations("pages.profile");
  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Suspense fallback={<ProfileInfoSkeleton />}>
        <ProfileInfo />
      </Suspense>
      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStats />
      </Suspense>
    </div>
  );
}
