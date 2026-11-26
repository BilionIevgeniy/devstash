import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { typePagePath } from "@/features/item-types/domain/item-type";
import { ItemDetailPage } from "@/features/items/components/drawer/ItemDetailPage";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { itemIdSchema } from "@/features/items/schemas";
import { openUserItemOfType } from "@/features/items/services/item-detail";

// The item's title, from the read the page makes too (cache()).
export async function generateMetadata({
  params,
}: PageProps<"/items/[type]/[id]">): Promise<Metadata> {
  const [{ type: slug, id }, { id: userId }] = await Promise.all([
    params,
    getSessionUser(),
  ]);
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return {};
  const result = await openUserItemOfType(userId, parsed.data, slug);
  return result.status === "ok" ? { title: result.item.title } : {};
}

export default async function ItemPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { type: slug, id } = await params;
  const { id: userId } = await getSessionUser();
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) notFound();
  const result = await openUserItemOfType(userId, parsed.data, slug);
  if (result.status === "locked") redirect(UPGRADE_PATH);
  if (result.status === "missing") notFound();

  const { item, canUseAi, editMode } = result;
  return (
    <div className="mx-auto max-w-3xl">
      <ItemDetailPage
        item={item}
        detail={toItemDetailJson(item)}
        canUseAi={canUseAi}
        editMode={editMode}
        listHref={typePagePath(slug)}
      />
    </div>
  );
}
