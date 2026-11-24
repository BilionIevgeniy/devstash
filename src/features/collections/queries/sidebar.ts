import "server-only";

import {
  fetchCollections,
  LAST_STARRED_FIRST,
} from "@/features/collections/_internal/queries/collection-rows";
import type { SidebarCollections } from "@/features/collections/types";
import {
  limitSidebarRows,
  SIDEBAR_ITEMS_LIMIT,
} from "@/features/items/domain/sidebar-items";

export async function getSidebarCollections(
  userId: string,
): Promise<SidebarCollections> {
  const take = SIDEBAR_ITEMS_LIMIT + 1;
  const [favoriteRows, recentRows] = await Promise.all([
    // Last starred first: a star leaves updatedAt alone, so a new favorite of
    // an old collection would otherwise fall past the limit.
    fetchCollections(
      userId,
      { isFavorite: true },
      { take, orderBy: LAST_STARRED_FIRST },
    ),
    fetchCollections(userId, {}, { take }),
  ]);
  const favorites = limitSidebarRows(favoriteRows);
  const recent = limitSidebarRows(recentRows);

  return {
    favorites: favorites.rows,
    recent: recent.rows,
    hasMoreFavorites: favorites.hasMore,
    hasMoreRecent: recent.hasMore,
  };
}
