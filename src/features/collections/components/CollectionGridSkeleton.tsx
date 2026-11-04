import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 6;

// The card height mirrors a rendered CollectionCard so the page does not shift
// when the real content replaces the skeleton.
const COLLECTION_CARD_HEIGHT = "h-34";

export function CollectionGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <Skeleton
          key={index}
          className={`${COLLECTION_CARD_HEIGHT} rounded-lg`}
        />
      ))}
    </div>
  );
}
