export interface ItemTypeInfo {
  id: string;
  name: string;
  /** The URL segment of the type page, fixed at creation (ADR 0031). */
  slug: string;
  icon: string;
  color?: string;
}

export interface SidebarItemType extends ItemTypeInfo {
  itemCount: number;
}
