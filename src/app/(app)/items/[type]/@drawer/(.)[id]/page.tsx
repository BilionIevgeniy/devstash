import { notFound } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { parseTypeSlug } from "@/features/item-types/domain/item-type";
import {
  ItemRouteDrawerMissing,
  ItemRouteDrawerView,
} from "@/features/items/components/ItemRouteDrawer";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { getUserItemDetailOfType } from "@/features/items/services/item-detail";

export default async function ItemDrawerPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { type: slug, id } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  // Not a 404: a delete from this drawer can refresh this route before the
  // drawer has gone back to the list, and a 404 would replace the whole page.
  const item = await getUserItemDetailOfType(userId, id, typeName);
  if (!item) return <ItemRouteDrawerMissing />;

  return <ItemRouteDrawerView item={item} detail={toItemDetailJson(item)} />;
}
