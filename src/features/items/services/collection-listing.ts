import "server-only";

import {
  groupItemsByType,
  type TypeGroup,
} from "@/features/items/domain/group-by-type";
import { typeListing } from "@/features/items/domain/item-fields";
import { getCollectionItemRecords } from "@/features/items/queries";
import { toFileListItem } from "@/features/items/services/file-list";
import { toGalleryItem } from "@/features/items/services/gallery";
import type {
  CollectionItemRecord,
  CollectionListing,
  CollectionSection,
  ItemCardData,
} from "@/features/items/types";

function toCardItem(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a card shows no upload, and the key never leaves the server
  { fileKey, fileName, fileSize, ...card }: CollectionItemRecord,
): ItemCardData {
  return card;
}

async function toSection(
  { type, items }: TypeGroup<CollectionItemRecord>,
  now: Date,
): Promise<CollectionSection> {
  const listing = typeListing(type.name);
  switch (listing) {
    case "gallery":
      return {
        listing,
        type,
        items: await Promise.all(items.map((item) => toGalleryItem(item, now))),
      };
    case "files":
      return {
        listing,
        type,
        items: await Promise.all(
          items.map((item) => toFileListItem(item, now)),
        ),
      };
    case "cards":
      return { listing, type, items: items.map(toCardItem) };
  }
}

// One read for the whole collection, then one section per type, listed the way
// that type's own page lists it.
export async function getUserCollectionListing(
  userId: string,
  collectionId: string,
): Promise<CollectionListing> {
  const records = await getCollectionItemRecords(userId, collectionId);
  const now = new Date();
  const sections = await Promise.all(
    groupItemsByType(records).map((group) => toSection(group, now)),
  );
  return { itemCount: records.length, sections };
}
