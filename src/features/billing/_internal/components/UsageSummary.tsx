import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
} from "@/features/billing/domain/limits";

interface UsageSummaryProps {
  itemCount: number;
  collectionCount: number;
}

export function UsageSummary({
  itemCount,
  collectionCount,
}: UsageSummaryProps) {
  return (
    <p className="text-sm text-muted-foreground">
      {itemCount}/{FREE_ITEM_LIMIT} items, {collectionCount}/
      {FREE_COLLECTION_LIMIT} collections
    </p>
  );
}
