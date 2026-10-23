export interface ItemTypeInfo {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface SidebarItemType extends ItemTypeInfo {
  itemCount: number;
}
