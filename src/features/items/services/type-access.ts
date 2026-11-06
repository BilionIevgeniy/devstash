import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import { canUseType, requiresPro } from "@/features/items/domain/item-fields";

// A type open to every plan needs no read of the plan.
export async function userCanUseType(
  userId: string,
  typeName: string,
): Promise<boolean> {
  if (!requiresPro(typeName)) return true;

  const { isPro } = await getEntitlements(userId);
  return canUseType(typeName, isPro);
}
