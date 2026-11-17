// The sorts of /pinned (feature 7), read in the database page by page (ADR
// 0025). An item has no pin date, so the dates are the creation dates.
export const PINNED_ITEM_SORTS = ["newest", "oldest", "a-z", "z-a"] as const;

export type PinnedItemSort = (typeof PINNED_ITEM_SORTS)[number];
