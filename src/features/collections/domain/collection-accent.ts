// The colour of a collection: that of its most used type, which comes first.
// None for an empty collection.
export function collectionAccent(
  types: readonly { color?: string }[],
): string | undefined {
  return types[0]?.color;
}
