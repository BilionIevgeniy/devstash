import { useTranslations } from "next-intl";

import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";

const FIELDS = 3;

export function ChangePasswordFormSkeleton() {
  const t = useTranslations("auth.changePassword");
  return (
    <div className="rounded-lg border bg-card p-6">
      <SkeletonText>{t("title")}</SkeletonText>
      <SkeletonText className="text-sm">{t("description")}</SkeletonText>
      <div className="mt-4 max-w-sm space-y-4">
        {Array.from({ length: FIELDS }, (_, index) => (
          // The label is inline, in a line of 24px right above the field.
          <div key={index} className="pt-0.5">
            <Skeleton className="mb-0.5 h-5 w-32" />
            <Skeleton className="h-8 w-full max-md:h-11" />
          </div>
        ))}
        <SkeletonButton>
          <span>{t("submit")}</span>
        </SkeletonButton>
      </div>
    </div>
  );
}
