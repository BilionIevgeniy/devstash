import type { ItemTypeInfo } from "@/features/item-types/types";

export interface DashboardItem {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  tags: string[];
  type: ItemTypeInfo;
}

export interface ItemCollectionRef {
  id: string;
  name: string;
}

export interface ItemDetail extends DashboardItem {
  contentType: string;
  content: string | null;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  language: string | null;
  updatedAt: Date;
  collections: ItemCollectionRef[];
}

// ItemDetail as it arrives from GET /api/items/[id]: dates become ISO strings.
export type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export interface ItemStats {
  total: number;
  favorites: number;
}
