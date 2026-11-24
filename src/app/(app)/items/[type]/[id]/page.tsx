import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { typePagePath } from "@/features/item-types/domain/item-type";
import { ItemDetailPage } from "@/features/items/components/drawer/ItemDetailPage";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { openUserItemOfType } from "@/features/items/services/item-detail";

export default async function ItemPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { type: slug, id } = await params;
  const { id: userId } = await getSessionUser();
  const result = await openUserItemOfType(userId, id, slug);
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
