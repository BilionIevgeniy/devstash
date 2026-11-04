import type { ItemCollectionRef } from "@/features/items/types";

const MAX_NAMES_SHOWN = 2;
const NAME_JOINER = ", ";

export const NO_COLLECTIONS_LABEL = "Choose collections";

// What the input lists: the options, plus the item's own collections, so every
// ticked id has a name and can be unticked even while the options load, after
// a failed fetch, or when a collection has just gone from the options.
export function collectionChoices(
  linked: ItemCollectionRef[],
  options: ItemCollectionRef[],
): ItemCollectionRef[] {
  const byId = new Map(
    [...linked, ...options].map((collection) => [collection.id, collection]),
  );
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// The one-line text on the trigger: a few names, then a count.
export function collectionSummary(
  choices: ItemCollectionRef[],
  selectedIds: string[],
): string {
  if (selectedIds.length === 0) return NO_COLLECTIONS_LABEL;
  if (selectedIds.length > MAX_NAMES_SHOWN) {
    return `${selectedIds.length} selected`;
  }
  return choices
    .filter((collection) => selectedIds.includes(collection.id))
    .map((collection) => collection.name)
    .join(NAME_JOINER);
}
