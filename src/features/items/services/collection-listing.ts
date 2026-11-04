import "server-only";

import {
  getCollectionItemRecords,
  getCollectionTypeCounts,
} from "@/features/items/_internal/queries";
import {
  groupItemsByType,
  type TypeGroup,
} from "@/features/items/domain/group-by-type";
import { typeListing } from "@/features/items/domain/item-fields";
import { ITEMS_PER_PAGE } from "@/features/items/domain/pagination";
import { toFileListItem } from "@/features/items/services/file-list";
import { toGalleryItem } from "@/features/items/services/gallery";
import type {
  CollectionItemRecord,
  CollectionListing,
  CollectionSection,
  ItemCardData,
} from "@/features/items/types";
import { readPage } from "@/lib/pagination";

function toCardItem(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a card shows no upload, and the key never leaves the server
  { fileKey, fileName, fileSize, ...card }: CollectionItemRecord,
): ItemCardData {
  return card;
}

async function toSection(
  { type, items }: TypeGroup<CollectionItemRecord>,
  totalCount: number,
  now: Date,
): Promise<CollectionSection> {
  const listing = typeListing(type.name);
  switch (listing) {
    case "gallery":
      return {
        listing,
        type,
        totalCount,
        items: await Promise.all(items.map((item) => toGalleryItem(item, now))),
      };
    case "files":
      return {
        listing,
        type,
        totalCount,
        items: await Promise.all(
          items.map((item) => toFileListItem(item, now)),
        ),
      };
    case "cards":
      return { listing, type, totalCount, items: items.map(toCardItem) };
  }
}

// One page of the collection, pinned then newest first, in one section per type,
// listed the way that type's own page lists it. The sections are ordered and
// labelled by the whole collection, so their order holds from page to page, and
// a pin leads only its own section. An item created between the two reads has
// no count yet: its page's items stand in.
export async function getUserCollectionListing(
  userId: string,
  collectionId: string,
  requestedPage: number,
): Promise<CollectionListing> {
  const typeCounts = await getCollectionTypeCounts(userId, collectionId);
  const { items, totalCount, page, totalPages } = await readPage(
    requestedPage,
    ITEMS_PER_PAGE,
    async () => [...typeCounts.values()].reduce((sum, n) => sum + n, 0),
    (skip, take) => getCollectionItemRecords(userId, collectionId, skip, take),
  );

  const now = new Date();
  const sections = await Promise.all(
    groupItemsByType(items)
      .map((group) => ({
        group,
        total: typeCounts.get(group.type.id) ?? group.items.length,
      }))
      .sort((a, b) => b.total - a.total)
      .map(({ group, total }) => toSection(group, total, now)),
  );
  return { itemCount: totalCount, page, totalPages, sections };
}
