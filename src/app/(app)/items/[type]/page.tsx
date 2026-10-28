import { notFound } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import {
  parseTypeSlug,
  typeSlug,
} from "@/features/item-types/domain/item-type";
import { getItemTypeByName } from "@/features/item-types/queries";
import { ItemList } from "@/features/items/components/ItemList";
import { getItemsByType } from "@/features/items/queries";

export default async function ItemsByTypePage({
  params,
}: PageProps<"/items/[type]">) {
  const { type: slug } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  const type = await getItemTypeByName(typeName);
  if (!type) notFound();

  const items = await getItemsByType(userId, type.id);
  const itemLabel = items.length === 1 ? "item" : "items";

  return (
    <div className="space-y-8">
      <header>
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
      </header>
      <ItemList
        items={items}
        emptyMessage={`No ${typeSlug(type.name)} yet.`}
      />
    </div>
  );
}
