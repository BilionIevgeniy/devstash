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

/** A custom type in the settings list: all its items, of any state. */
export type CustomTypeRow = SidebarItemType;
