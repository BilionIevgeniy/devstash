"use client";

import { useParams } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { parseTypeSlug } from "@/features/item-types/domain/item-type";
import { ImageGallerySkeleton } from "@/features/items/components/ImageGallerySkeleton";
import { isGalleryType } from "@/features/items/domain/item-fields";

const CARD_COUNT = 6;

// The card height mirrors a rendered ItemCard so the page does not shift when
// the real content replaces the skeleton.
const ITEM_CARD_HEIGHT = "h-38";

// A client component to read the type from the URL: an image type gets the
// gallery's skeleton, every other type the cards'.
export default function ItemsByTypeLoading() {
  const { type } = useParams<{ type: string }>();
  const typeName = parseTypeSlug(type);
  const gallery = typeName !== null && isGalleryType(typeName);

  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-5 w-20" />
      </header>
      {gallery ? (
        <ImageGallerySkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <Skeleton
              key={index}
              className={`${ITEM_CARD_HEIGHT} rounded-lg`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
