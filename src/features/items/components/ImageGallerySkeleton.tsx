import { Skeleton } from "@/components/ui/skeleton";

// Shared with ImageGallery and ImageCard, so the skeleton has the columns and
// card size of the gallery that replaces it. Kept apart from the gallery: the
// client loading.tsx imports only this file.
export const IMAGE_GALLERY_GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
export const IMAGE_CARD_TITLE_HEIGHT = "h-12";

const CARD_COUNT = 6;

export function ImageGallerySkeleton() {
  return (
    <div className={IMAGE_GALLERY_GRID}>
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-video rounded-none" />
          <div className={`flex items-center px-3 ${IMAGE_CARD_TITLE_HEIGHT}`}>
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
