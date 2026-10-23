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

export interface ItemStats {
  total: number;
  favorites: number;
}
