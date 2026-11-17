import { z } from "zod";

// Digits only: Number() alone would also take 1e3, 0x10 and " 2".
const pageSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number);

export interface Paginated<T> {
  items: T[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export type PageMark = number | "gap";

export function parsePage(value: string | string[] | undefined): number {
  const parsed = pageSchema.safeParse(value);
  return parsed.success ? parsed.data : 1;
}

export function totalPages(count: number, perPage: number): number {
  return Math.max(1, Math.ceil(count / perPage));
}

export function clampPage(page: number, lastPage: number): number {
  return Math.min(page, lastPage);
}

export interface PagePosition {
  page: number;
  totalPages: number;
}

// A page past the end shows the last one: deleting the only item of the last
// page leaves its URL behind, and that must not become an empty list.
export function pagePosition(
  count: number,
  perPage: number,
  requestedPage: number,
): PagePosition {
  const lastPage = totalPages(count, perPage);
  return { page: clampPage(requestedPage, lastPage), totalPages: lastPage };
}

export function pageSkip(page: number, perPage: number): number {
  return (page - 1) * perPage;
}

export function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

// The first page, the last and the neighbours of the current one. A gap that
// would hide a single number shows that number instead.
export function pageNumbers(current: number, lastPage: number): PageMark[] {
  const shown = [...new Set([1, current - 1, current, current + 1, lastPage])]
    .filter((page) => page >= 1 && page <= lastPage)
    .sort((a, b) => a - b);

  return shown.flatMap((page, index): PageMark[] => {
    const skipped = page - (shown[index - 1] ?? 0) - 1;
    if (skipped === 1) return [page - 1, page];
    return skipped > 1 ? ["gap", page] : [page];
  });
}

export async function readPage<T>(
  requestedPage: number,
  perPage: number,
  count: () => Promise<number>,
  read: (skip: number, take: number) => Promise<T[]>,
): Promise<Paginated<T>> {
  const totalCount = await count();
  const position = pagePosition(totalCount, perPage, requestedPage);
  const items = await read(pageSkip(position.page, perPage), perPage);
  return { items, totalCount, ...position };
}
