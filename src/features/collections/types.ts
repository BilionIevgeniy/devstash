import type { ItemTypeInfo } from "@/features/item-types/types";

export interface DashboardCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  /** Distinct item types in the collection, most frequent first. */
  types: ItemTypeInfo[];
}

export interface SidebarCollections {
  favorites: DashboardCollection[];
  recent: DashboardCollection[];
}

export interface CollectionStats {
  total: number;
  favorites: number;
}
