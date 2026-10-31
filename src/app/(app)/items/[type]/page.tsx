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
import { ImageGallery } from "@/features/items/components/ImageGallery";
import {
  isCreatableType,
  isGalleryType,
} from "@/features/items/domain/item-fields";
import { ItemList } from "@/features/items/components/ItemList";
import { getItemsByType } from "@/features/items/queries";
import { getUserGalleryItems } from "@/features/items/services/gallery";

export default async function ItemsByTypePage({
  params,
}: PageProps<"/items/[type]">) {
  const { type: slug } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  const type = await getItemTypeByName(typeName);
  if (!type) notFound();

  // An image type shows its items as thumbnails, every other type as cards.
  const listing = isGalleryType(type.name)
    ? getUserGalleryItems(userId, type.id).then((items) => ({
        gallery: true as const,
        items,
      }))
    : getItemsByType(userId, type.id).then((items) => ({
        gallery: false as const,
        items,
      }));
  const [list, { isPro }] = await Promise.all([
    listing,
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
      {list.gallery ? (
        <ImageGallery items={list.items} emptyMessage={emptyMessage} />
      ) : (
        <ItemList items={list.items} emptyMessage={emptyMessage} />
      )}
    </div>
  );
}
