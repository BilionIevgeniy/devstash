import type { ItemCollectionRef } from "@/features/items/types";

const MAX_NAMES_SHOWN = 2;
const NAME_JOINER = ", ";

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

export type CollectionSummary =
  | { kind: "none" }
  | { kind: "count"; count: number }
  | { kind: "names"; names: string };

// What the trigger says in one line: nothing chosen yet, a few names, or past
// that a count. The component words "none" and "count".
export function collectionSummary(
  choices: ItemCollectionRef[],
  selectedIds: string[],
): CollectionSummary {
  if (selectedIds.length === 0) return { kind: "none" };
  if (selectedIds.length > MAX_NAMES_SHOWN) {
    return { kind: "count", count: selectedIds.length };
  }
  const names = choices
    .filter((collection) => selectedIds.includes(collection.id))
    .map((collection) => collection.name)
    .join(NAME_JOINER);
  return { kind: "names", names };
}
