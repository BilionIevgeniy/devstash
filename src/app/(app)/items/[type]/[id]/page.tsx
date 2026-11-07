import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { parseTypeSlug } from "@/features/item-types/domain/item-type";
import { ItemDetailPage } from "@/features/items/components/ItemDetailPage";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { getUserItemDetailOfType } from "@/features/items/services/item-detail";
import { userCanUseType } from "@/features/items/services/type-access";

export default async function ItemPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { type: slug, id } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  if (!(await userCanUseType(userId, typeName))) {
    redirect(UPGRADE_PATH);
  }

  // cache() shares this read with the plan check above.
  const [item, { isPro }] = await Promise.all([
    getUserItemDetailOfType(userId, id, typeName),
    getEntitlements(userId),
  ]);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <ItemDetailPage
        item={item}
        detail={toItemDetailJson(item)}
        canUseAi={isPro}
        listHref={`/items/${slug}`}
      />
    </div>
  );
}
