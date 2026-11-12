import { FilteredEmpty } from "@/app/(app)/items/[type]/_components/FilteredEmpty";
import { typeSlug } from "@/features/item-types/domain/item-type";
import type { ItemTypeInfo } from "@/features/item-types/types";
import { FileList } from "@/features/items/components/FileList";
import { ImageGallery } from "@/features/items/components/ImageGallery";
import { ItemList } from "@/features/items/components/ItemList";
import { typeListing } from "@/features/items/domain/item-fields";
import {
  isFilteredList,
  itemListHref,
  type ItemListParams,
} from "@/features/items/domain/list-params";
import { ITEMS_PER_PAGE } from "@/features/items/domain/pagination";
import { getItemsOfType } from "@/features/items/queries";
import { getUserFileListItems } from "@/features/items/services/file-list";
import { getUserGalleryItems } from "@/features/items/services/gallery";
import { pageSkip } from "@/lib/pagination";

interface ItemsListingProps {
  userId: string;
  type: ItemTypeInfo;
  params: ItemListParams;
  totalCount: number;
  basePath: string;
}

// The rows of one page, in the Suspense of the page. The page is already
// clamped by the count the page read, and the empty state follows that count,
// so the header and the list cannot disagree. An image type shows its items as
// thumbnails, a file type as rows of files, every other type as cards.
export async function ItemsListing({
  userId,
  type,
  params,
  totalCount,
  basePath,
}: ItemsListingProps) {
  if (totalCount === 0 && isFilteredList(params)) {
    return (
      <FilteredEmpty
        clearHref={itemListHref(basePath, params, { tag: null })}
      />
    );
  }

  const emptyMessage = `No ${typeSlug(type.name)} yet.`;
  const read = [
    userId,
    type.id,
    params,
    pageSkip(params.page, ITEMS_PER_PAGE),
    ITEMS_PER_PAGE,
  ] as const;

  switch (typeListing(type.name)) {
    case "gallery": {
      const items = totalCount === 0 ? [] : await getUserGalleryItems(...read);
      return <ImageGallery items={items} emptyMessage={emptyMessage} />;
    }
    case "files": {
      const items = totalCount === 0 ? [] : await getUserFileListItems(...read);
      return <FileList items={items} emptyMessage={emptyMessage} />;
    }
    case "cards": {
      const items = totalCount === 0 ? [] : await getItemsOfType(...read);
      return <ItemList items={items} emptyMessage={emptyMessage} />;
    }
  }
}
