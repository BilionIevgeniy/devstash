import { useFormatter, useTranslations } from "next-intl";

import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";

// The classes ProfileInfo and UsageStats share with their skeletons.
export const PROFILE_INFO =
  "flex items-center gap-4 rounded-lg border bg-card p-6";
export const USAGE_TOTALS = "grid grid-cols-2 gap-4";
export const USAGE_TYPES = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

const TOTALS = 2;
// The built-in types; a user with custom types has more.
const TYPE_ROWS = 7;
// A long date, for the line that wraps on a phone.
const TYPICAL_DATE = new Date("2025-11-30T12:00:00Z");

export function ProfileInfoSkeleton() {
  const format = useFormatter();
  const t = useTranslations("pages.profile");
  return (
    <div className={PROFILE_INFO}>
      <Skeleton className="size-16 shrink-0 rounded-full" />
      <div className="min-w-0">
        <div className="flex h-7 items-center">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-44 max-w-full" />
        </div>
        <SkeletonText className="mt-1 text-sm">
          {t("memberSince", { date: format.dateTime(TYPICAL_DATE, "long") })}
        </SkeletonText>
      </div>
    </div>
  );
}

export function UsageStatsSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className={USAGE_TOTALS}>
        {Array.from({ length: TOTALS }, (_, index) => (
          <Skeleton key={index} className="h-22.5 rounded-lg" />
        ))}
      </div>
      <div className={USAGE_TYPES}>
        {Array.from({ length: TYPE_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-12.5 rounded-lg" />
        ))}
      </div>
    </section>
  );
}
