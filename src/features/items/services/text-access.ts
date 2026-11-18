import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import { textEditsAllowed } from "@/features/billing/domain/limits";
import { getItemCount } from "@/features/items/queries";

// Whether the user may rewrite the text of their items (ADR 0032): always on
// Pro, and on Free only at or under the item limit. Shared by every writer of
// an item's text, so no action gets around it. Pro skips the count.
export async function userCanEditText(userId: string): Promise<boolean> {
  const { isPro } = await getEntitlements(userId);
  if (isPro) return true;
  return textEditsAllowed(false, await getItemCount(userId));
}

/** How the edit form opens: the text too, or the collections only (ADR 0032). */
export type ItemEditMode = "full" | "collectionsOnly";

export async function getItemEditMode(userId: string): Promise<ItemEditMode> {
  return (await userCanEditText(userId)) ? "full" : "collectionsOnly";
}
