// The URL state of a type page: /items/<type>?sort=&tag=&page=. The type is in
// the path. The meaning of each sort is the one of FAVORITE_ITEM_SORTS; "type"
// is left out, since every row of the page has the same type.
export const ITEM_LIST_SORTS = ["newest", "oldest", "a-z", "z-a"] as const;

export type ItemListSort = (typeof ITEM_LIST_SORTS)[number];

export interface ItemListParams {
  sort: ItemListSort;
  tag: string | null;
  page: number;
}

// What the rows are: the page only says which of them are shown.
export type ItemListFilter = Pick<ItemListParams, "sort" | "tag">;

export const DEFAULT_ITEM_LIST_PARAMS: ItemListParams = {
  sort: "newest",
  tag: null,
  page: 1,
};

// A tag narrows the rows; a sort only orders them.
export function isFilteredList(params: ItemListParams): boolean {
  return params.tag !== null;
}

// The one place the query of a type page is written. A change of the sort or
// the tag starts again at page 1, since the old page number points into
// another list. Defaults are left out, so the default view is the bare path,
// and the page comes last, so the same view always has the same URL.
export function itemListHref(
  basePath: string,
  current: ItemListParams,
  change: Partial<ItemListParams> = {},
): string {
  const next = { ...current, ...change };
  const resetsPage = "sort" in change || "tag" in change;
  const page = resetsPage && !("page" in change) ? 1 : next.page;

  const query = new URLSearchParams();
  if (next.sort !== DEFAULT_ITEM_LIST_PARAMS.sort) query.set("sort", next.sort);
  if (next.tag !== null) query.set("tag", next.tag);
  if (page > 1) query.set("page", String(page));

  const search = query.toString();
  return search === "" ? basePath : `${basePath}?${search}`;
}
