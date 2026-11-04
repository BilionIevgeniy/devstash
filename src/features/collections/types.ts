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

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

export interface CollectionOption {
  id: string;
  name: string;
}

export interface SearchableCollection {
  id: string;
  name: string;
  itemCount: number;
}

export interface SidebarCollections {
  favorites: DashboardCollection[];
  recent: DashboardCollection[];
}

export interface CollectionStats {
  total: number;
  favorites: number;
}
