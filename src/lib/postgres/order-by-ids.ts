// Puts rows read by `id: { in: ids }` back in the order of the ids, which a
// database read does not keep. An id with no row (deleted in between) is left
// out, and a repeated id gives one row.
export function orderByIds<Row extends { id: string }>(
  ids: readonly string[],
  rows: readonly Row[],
): Row[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [...new Set(ids)].flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
