export interface ItemTypeInfo {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

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

export interface SidebarItemType extends ItemTypeInfo {
  itemCount: number;
}

export interface ItemStats {
  total: number;
  favorites: number;
}
