import Link from "next/link";

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
  return (
    <div className="space-y-1 text-sm">
      <p className="text-muted-foreground">
        {itemCount}/{FREE_ITEM_LIMIT} items, {collectionCount}/
        {FREE_COLLECTION_LIMIT} collections
      </p>
      {reachedFreeLimit(itemCount, collectionCount) && (
        <p>
          You&apos;ve reached the Free plan&apos;s limit. Delete something to
          create more, or{" "}
          <Link
            href={UPGRADE_PATH}
            className="font-medium underline underline-offset-4"
          >
            upgrade to Pro
          </Link>
          .
        </p>
      )}
    </div>
  );
}
