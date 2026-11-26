import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 6;

// The height of an ItemCard with a one-line description and tags, so the page
// does not shift when the real content replaces the skeleton.
const ITEM_CARD_HEIGHT = "h-27.5";

export function ItemListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <Skeleton key={index} className={`${ITEM_CARD_HEIGHT} rounded-lg`} />
      ))}
    </div>
  );
}
