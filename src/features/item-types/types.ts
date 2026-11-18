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

/** A custom type as the export writes it (ADR 0031): no id and no slug, which
 * belong to the account that imports it. */
export interface ExportedCustomType {
  name: string;
  icon: string | null;
  color: string | null;
}

/** A custom type in the settings list: all its items, of any state. */
export type CustomTypeRow = SidebarItemType;
