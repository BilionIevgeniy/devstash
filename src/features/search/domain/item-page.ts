import { typePagePath } from "@/features/item-types/domain/item-type";

interface ItemPageTarget {
  id: string;
  type: { slug: string };
}

export function itemPagePath(item: ItemPageTarget): string {
  return `${typePagePath(item.type.slug)}/${encodeURIComponent(item.id)}`;
}

// Whether this path is the item's own full page. The palette and the sidebar do
// not open a drawer over it: a delete there would refresh the page into a 404,
// and an edit would leave the page behind the drawer stale.
export function isItemPage(pathname: string, item: ItemPageTarget): boolean {
  return pathname === itemPagePath(item);
}
