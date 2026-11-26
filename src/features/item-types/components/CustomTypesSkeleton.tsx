"use client";

import { useTranslations } from "next-intl";

import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";

// The section of a Free user, the common case: no types and the upgrade.
export function CustomTypesSkeleton() {
  const t = useTranslations("customTypes");
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="rounded-lg border bg-card">
        <div className="p-4">
          <SkeletonText className="text-sm">{t("locked")}</SkeletonText>
        </div>
        <div className="border-t p-4 text-sm">
          <SkeletonButton size="sm">
            <span>{t("upgrade")}</span>
          </SkeletonButton>
        </div>
      </div>
    </section>
  );
}
