export const NAME_MAX = 200;
export const DESCRIPTION_MAX = 2_000;

// What the forms hold: both fields as the text in their inputs.
export interface CollectionFormValues {
  name: string;
  description: string;
}

// Whether saving would change the collection. Trimmed like the schema trims
// it: "  " and "" are both empty. An unchanged save must not go out, because
// it would move the collection to the top of the lists sorted by `updatedAt`.
export function hasCollectionChanges(
  initial: CollectionFormValues,
  current: CollectionFormValues,
): boolean {
  return (
    initial.name.trim() !== current.name.trim() ||
    initial.description.trim() !== current.description.trim()
  );
}
