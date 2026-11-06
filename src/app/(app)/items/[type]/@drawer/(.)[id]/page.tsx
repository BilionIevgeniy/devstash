import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import {
  ItemRouteDrawerMissing,
  ItemRouteDrawerView,
} from "@/features/items/components/ItemRouteDrawer";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { openUserItem } from "@/features/items/services/item-detail";

// No type check here: the interception rewrite takes `type` from the page the
// link was clicked on, so a sidebar row of another type lands with the wrong
// one. A typed URL is a hard load and never reaches this route.
export default async function ItemDrawerPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { id } = await params;
  const { id: userId } = await getSessionUser();
  const result = await openUserItem(userId, id);
  // Not a 404: a delete from this drawer can refresh this route before the
  // drawer has gone back to the list, and a 404 would replace the whole page.
  if (result.status === "missing") return <ItemRouteDrawerMissing />;
  if (result.status === "locked") redirect(UPGRADE_PATH);

  const { item } = result;
  return <ItemRouteDrawerView item={item} detail={toItemDetailJson(item)} />;
}
