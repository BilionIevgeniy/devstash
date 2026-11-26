"use client";

import { useFormatter, useTranslations } from "next-intl";

import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  proYearlySavingsPercent,
} from "@/features/billing/domain/limits";

interface BillingSectionSkeletonProps {
  /** Stripe runs on a test key: the hint is under the buttons. */
  testMode: boolean;
}

// The section of a Free user below the limits, the common case.
export function BillingSectionSkeleton({
  testMode,
}: BillingSectionSkeletonProps) {
  const format = useFormatter();
  const t = useTranslations("billing");
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <div className="flex h-6 items-center justify-between gap-4">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-11 rounded-full" />
        </div>
        <SkeletonText className="text-sm">
          {t("settings.usage", {
            items: 0,
            itemLimit: FREE_ITEM_LIMIT,
            collections: 0,
            collectionLimit: FREE_COLLECTION_LIMIT,
          })}
        </SkeletonText>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <SkeletonButton>
              <span>
                {t("settings.upgradeMonthly", {
                  price: format.number(PRO_MONTHLY_PRICE, "price"),
                })}
              </span>
            </SkeletonButton>
            <SkeletonButton>
              <span>
                {t("settings.upgradeYearly", {
                  price: format.number(PRO_YEARLY_PRICE, "price"),
                  percent: proYearlySavingsPercent(),
                })}
              </span>
            </SkeletonButton>
          </div>
          {testMode && (
            <SkeletonText className="text-xs">{t("testModeHint")}</SkeletonText>
          )}
        </div>
      </div>
    </section>
  );
}
