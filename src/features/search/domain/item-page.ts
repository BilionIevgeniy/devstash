import { typeSlug } from "@/features/item-types/domain/item-type";

// Whether this path is the item's own full page. The palette does not open a
// drawer over it: a delete there would refresh the page into a 404, and an edit
// would leave the page behind the drawer stale.
export function isItemPage(
  pathname: string,
  item: { id: string; type: { name: string } },
): boolean {
  const itemPath = `/items/${typeSlug(item.type.name)}/${encodeURIComponent(item.id)}`;
  return pathname === itemPath;
}
