import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 6;

// The card height mirrors a rendered ItemCard so the page does not shift when
// the real content replaces the skeleton.
const ITEM_CARD_HEIGHT = "h-38";

export default function ItemsByTypeLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-5 w-20" />
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <Skeleton key={index} className={`${ITEM_CARD_HEIGHT} rounded-lg`} />
        ))}
      </div>
    </div>
  );
}
