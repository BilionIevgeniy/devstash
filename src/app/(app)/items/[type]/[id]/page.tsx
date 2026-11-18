import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { getItemEditMode } from "@/features/items/services/text-access";
import { systemTypeNameForSlug } from "@/features/item-types/domain/item-type";
import { ItemDetailPage } from "@/features/items/components/drawer/ItemDetailPage";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { getUserItemDetailOfType } from "@/features/items/services/item-detail";
import { userCanUseType } from "@/features/items/services/type-access";

export default async function ItemPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { type: slug, id } = await params;
  const { id: userId } = await getSessionUser();
  // A custom type can be opened on every plan (its items stay readable after a
  // downgrade, ADR 0032); only a Pro system type is checked before the read.
  const systemName = systemTypeNameForSlug(slug);
  if (systemName && !(await userCanUseType(userId, systemName))) {
    redirect(UPGRADE_PATH);
  }

  // cache() shares this read with the plan check above.
  const [item, { isPro }, editMode] = await Promise.all([
    getUserItemDetailOfType(userId, id, slug),
    getEntitlements(userId),
    getItemEditMode(userId),
  ]);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <ItemDetailPage
        item={item}
        detail={toItemDetailJson(item)}
        canUseAi={isPro}
        editMode={editMode}
        listHref={`/items/${slug}`}
      />
    </div>
  );
}
