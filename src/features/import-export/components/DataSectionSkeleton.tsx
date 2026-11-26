import { useTranslations } from "next-intl";

import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";

// The section of a Free user, the common case.
export function DataSectionSkeleton() {
  const t = useTranslations("importExport");
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <SkeletonText className="text-sm">{t("description")}</SkeletonText>
        <div className="flex flex-wrap items-center gap-3">
          <SkeletonText className="text-sm">{t("proOnly")}</SkeletonText>
          <SkeletonButton>
            <span>{t("upgrade")}</span>
          </SkeletonButton>
        </div>
      </div>
    </section>
  );
}
