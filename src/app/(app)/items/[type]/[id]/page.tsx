import { notFound } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { parseTypeSlug } from "@/features/item-types/domain/item-type";
import { ItemDetailPage } from "@/features/items/components/ItemDetailPage";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { getItemDetailOfType } from "@/features/items/queries";

export default async function ItemPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { type: slug, id } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  const item = await getItemDetailOfType(userId, id, typeName);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <ItemDetailPage
        item={item}
        detail={toItemDetailJson(item)}
        listHref={`/items/${slug}`}
      />
    </div>
  );
}
