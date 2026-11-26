import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import {
  ItemRouteDrawerMissing,
  ItemRouteDrawerView,
} from "@/features/items/components/drawer/ItemRouteDrawer";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import { itemIdSchema } from "@/features/items/schemas";
import { openUserItem } from "@/features/items/services/item-detail";

// Next's instant validation cannot render this intercepted route: the shell's
// palette is browser-only (next/dynamic without SSR), and it stops there. The
// drawer's loading state on a click is measured in e2e/skeletons.spec.ts.
export const instant = false;

// No type check here: the interception rewrite takes `type` from the page the
// link was clicked on, so a sidebar row of another type lands with the wrong
// one. A typed URL is a hard load and never reaches this route.
export default async function ItemDrawerPage({
  params,
}: PageProps<"/items/[type]/[id]">) {
  const { id } = await params;
  const { id: userId } = await getSessionUser();
  // A refused id is missing too: a 404 would replace the whole page.
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return <ItemRouteDrawerMissing />;
  const result = await openUserItem(userId, parsed.data);
  // Not a 404: a delete from this drawer can refresh this route before the
  // drawer has gone back to the list, and a 404 would replace the whole page.
  if (result.status === "missing") return <ItemRouteDrawerMissing />;
  if (result.status === "locked") redirect(UPGRADE_PATH);

  const { item, canUseAi, editMode } = result;
  return (
    <ItemRouteDrawerView
      item={item}
      detail={toItemDetailJson(item)}
      canUseAi={canUseAi}
      editMode={editMode}
    />
  );
}
