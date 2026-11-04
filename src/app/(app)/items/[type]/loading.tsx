"use client";

import { useParams } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { parseTypeSlug } from "@/features/item-types/domain/item-type";
import { FileListSkeleton } from "@/features/items/components/FileListSkeleton";
import { ImageGallerySkeleton } from "@/features/items/components/ImageGallerySkeleton";
import { ItemListSkeleton } from "@/features/items/components/ItemListSkeleton";
import { typeListing } from "@/features/items/domain/item-fields";

// A client component to read the type from the URL: an image type gets the
// gallery's skeleton, a file type the file list's, every other type the cards'.
export default function ItemsByTypeLoading() {
  const { type } = useParams<{ type: string }>();
  const typeName = parseTypeSlug(type);
  const listing = typeName === null ? "cards" : typeListing(typeName);

  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-5 w-20" />
      </header>
      {listing === "gallery" && <ImageGallerySkeleton />}
      {listing === "files" && <FileListSkeleton />}
      {listing === "cards" && <ItemListSkeleton />}
    </div>
  );
}
