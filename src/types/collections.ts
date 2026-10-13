export interface CollectionType {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface DashboardCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  /** Distinct item types in the collection, most frequent first. */
  types: CollectionType[];
}

export interface CollectionStats {
  total: number;
  favorites: number;
}
