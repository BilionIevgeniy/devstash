export interface BatchLimits {
  maxRecords: number;
  maxBytes: number;
}

export interface Batches<T> {
  batches: T[][];
  /** Records over maxBytes on their own: never sent. */
  oversized: T[];
}

// Splits the records into batches in order, each within both limits. The size
// of a record is measured by the caller (the UTF-8 bytes of its JSON).
export function toBatches<T>(
  records: readonly T[],
  { maxRecords, maxBytes }: BatchLimits,
  sizeOf: (record: T) => number,
): Batches<T> {
  const batches: T[][] = [];
  const oversized: T[] = [];
  let current: T[] = [];
  let currentBytes = 0;

  for (const record of records) {
    const size = sizeOf(record);
    if (size > maxBytes) {
      oversized.push(record);
      continue;
    }
    if (current.length === maxRecords || currentBytes + size > maxBytes) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(record);
    currentBytes += size;
  }
  if (current.length > 0) batches.push(current);
  return { batches, oversized };
}
