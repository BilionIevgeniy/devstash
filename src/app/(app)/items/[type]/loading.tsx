"use client";

import { useParams } from "next/navigation";

import { SORT_SELECT_WIDTH } from "@/app/(app)/_components/SortSelect";
import { ItemsHeaderSkeleton } from "@/app/(app)/items/[type]/_components/ItemsHeaderSkeleton";
import { ListingSkeleton } from "@/app/(app)/items/[type]/_components/ListingSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { systemTypeNameForSlug } from "@/features/item-types/domain/item-type";
import { typeListing } from "@/features/items/domain/item-fields";
import { cn } from "@/lib/utils";

// A client component to read the type from the URL: an image type gets the
// gallery's skeleton, a file type the file list's, every other type (a custom
// type too) the cards'.
// It shows on the first load and on a change of type; a change of the query
// keeps the page on screen (see page.tsx).
export default function ItemsByTypeLoading() {
  const { type } = useParams<{ type: string }>();
  const typeName = systemTypeNameForSlug(type);
  const listing = typeName === null ? "cards" : typeListing(typeName);

  return (
    <div className="space-y-8">
      <ItemsHeaderSkeleton typeName={typeName} />
      <div className="space-y-4">
        <Skeleton className={cn(SORT_SELECT_WIDTH, "h-8 max-md:h-11")} />
        <ListingSkeleton listing={listing} />
      </div>
    </div>
  );
}
