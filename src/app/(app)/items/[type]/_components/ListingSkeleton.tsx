import { FileListSkeleton } from "@/features/items/components/FileListSkeleton";
import { ImageGallerySkeleton } from "@/features/items/components/ImageGallerySkeleton";
import { ItemListSkeleton } from "@/features/items/components/ItemListSkeleton";
import type { TypeListing } from "@/features/items/domain/item-fields";

interface ListingSkeletonProps {
  listing: TypeListing;
}

// The rows only: the header, the filters and the pagination stay on screen
// while a list loads.
export function ListingSkeleton({ listing }: ListingSkeletonProps) {
  if (listing === "gallery") return <ImageGallerySkeleton />;
  if (listing === "files") return <FileListSkeleton />;
  return <ItemListSkeleton />;
}
