import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  reachedFreeLimit,
} from "@/features/billing/domain/limits";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";

interface UsageSummaryProps {
  itemCount: number;
  collectionCount: number;
}

export function UsageSummary({
  itemCount,
  collectionCount,
}: UsageSummaryProps) {
  const t = useTranslations("billing.settings");
  return (
    <div className="space-y-1 text-sm">
      <p className="text-muted-foreground">
        {t("usage", {
          items: itemCount,
          itemLimit: FREE_ITEM_LIMIT,
          collections: collectionCount,
          collectionLimit: FREE_COLLECTION_LIMIT,
        })}
      </p>
      {reachedFreeLimit(itemCount, collectionCount) && (
        <p>
          {t.rich("limitReached", {
            link: (chunks) => (
              <Link
                href={UPGRADE_PATH}
                className="font-medium underline underline-offset-4"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
    </div>
  );
}
