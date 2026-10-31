import { notFound } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import {
  parseTypeSlug,
  typeSlug,
} from "@/features/item-types/domain/item-type";
import { getItemTypeByName } from "@/features/item-types/queries";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";
import { FileList } from "@/features/items/components/FileList";
import { ImageGallery } from "@/features/items/components/ImageGallery";
import {
  isCreatableType,
  typeListing,
} from "@/features/items/domain/item-fields";
import { ItemList } from "@/features/items/components/ItemList";
import { getItemsByType } from "@/features/items/queries";
import { getUserFileListItems } from "@/features/items/services/file-list";
import { getUserGalleryItems } from "@/features/items/services/gallery";
import type {
  FileListItem,
  GalleryItem,
  ItemCardData,
} from "@/features/items/types";

type Listing =
  | { kind: "gallery"; items: GalleryItem[] }
  | { kind: "files"; items: FileListItem[] }
  | { kind: "cards"; items: ItemCardData[] };

// An image type shows its items as thumbnails, a file type as rows of files,
// every other type as cards.
async function loadListing(
  userId: string,
  typeId: string,
  typeName: string,
): Promise<Listing> {
  switch (typeListing(typeName)) {
    case "gallery":
      return {
        kind: "gallery",
        items: await getUserGalleryItems(userId, typeId),
      };
    case "files":
      return {
        kind: "files",
        items: await getUserFileListItems(userId, typeId),
      };
    case "cards":
      return {
        kind: "cards",
        items: await getItemsByType(userId, typeId),
      };
  }
}

export default async function ItemsByTypePage({
  params,
}: PageProps<"/items/[type]">) {
  const { type: slug } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  const type = await getItemTypeByName(typeName);
  if (!type) notFound();

  const [list, { isPro }] = await Promise.all([
    loadListing(userId, type.id, type.name),
    getEntitlements(userId),
  ]);
  const { items } = list;
  const itemLabel = items.length === 1 ? "item" : "items";
  const emptyMessage = `No ${typeSlug(type.name)} yet.`;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold capitalize">
            <TypeIcon
              name={type.icon}
              className="size-7"
              style={{ color: type.color }}
            />
            {typeSlug(type.name)}
          </h1>
          <p className="text-muted-foreground">
            {items.length} {itemLabel}
          </p>
        </div>
        {isCreatableType(type.name) && (
          <CreateItemDialog defaultType={type.name} isPro={isPro} />
        )}
      </header>
      {list.kind === "gallery" && (
        <ImageGallery items={list.items} emptyMessage={emptyMessage} />
      )}
      {list.kind === "files" && (
        <FileList items={list.items} emptyMessage={emptyMessage} />
      )}
      {list.kind === "cards" && (
        <ItemList items={list.items} emptyMessage={emptyMessage} />
      )}
    </div>
  );
}
