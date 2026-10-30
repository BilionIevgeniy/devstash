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
import { isCreatableType } from "@/features/items/domain/item-fields";
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

  const [items, { isPro }] = await Promise.all([
    getItemsByType(userId, type.id),
    getEntitlements(userId),
  ]);
  const itemLabel = items.length === 1 ? "item" : "items";

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
      <ItemList items={items} emptyMessage={`No ${typeSlug(type.name)} yet.`} />
    </div>
  );
}
