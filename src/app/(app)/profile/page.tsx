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
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <Suspense fallback={<ProfileInfoSkeleton />}>
        <ProfileInfo />
      </Suspense>
      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStats />
      </Suspense>
    </div>
  );
}
