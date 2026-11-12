import type { FileUrls } from "@/features/files/types";
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

// What the item cards and rows get: whether their copy button has something
// to copy. The text itself is fetched on click, so a list never carries the
// content of every item to the browser.
export interface ItemCardData extends DashboardItem {
  canCopy: boolean;
}

// What the command palette searches and opens: a short preview of the text,
// never the content itself.
export interface SearchableItem extends DashboardItem {
  preview: string | null;
}

// One page of search results; nextOffset is null on the last page.
export interface SearchableItemPage {
  items: SearchableItem[];
  nextOffset: number | null;
}

// A row of the favorites page, dated by when it was starred.
export interface FavoriteItem extends DashboardItem {
  favoritedAt: Date;
}

// A row of the sidebar: only what the link shows.
export interface SidebarItem {
  id: string;
  title: string;
  type: ItemTypeInfo;
}

export interface SidebarItems {
  favorites: SidebarItem[];
  pinned: SidebarItem[];
  hasMoreFavorites: boolean;
  hasMorePinned: boolean;
}

export interface ItemCollectionRef {
  id: string;
  name: string;
}

interface ItemDetailFields extends DashboardItem {
  contentType: string;
  content: string | null;
  url: string | null;
  language: string | null;
  updatedAt: Date;
  collections: ItemCollectionRef[];
}

// What the queries read. The object key stays on the server: only the item
// detail service sees it, to sign the URLs.
export interface ItemDetailRecord extends ItemDetailFields {
  fileKey: string | null;
  fileName: string | null;
  fileSize: number | null;
}

export interface ItemFile extends FileUrls {
  name: string;
  size: number;
}

// What pages, routes and the drawer get: the upload as signed URLs.
export interface ItemDetail extends ItemDetailFields {
  file: ItemFile | null;
}

// What the query of a file or image type reads. The object key stays on the
// server: only the gallery and file list services see it, to sign the URLs.
export interface UploadItemRecord extends DashboardItem {
  fileKey: string | null;
  fileName: string | null;
  fileSize: number | null;
}

// What the gallery of an image type page gets: the upload as a signed URL.
export interface GalleryItem extends DashboardItem {
  imageUrl: string | null;
}

// What the file list of a file type page gets: the upload as signed URLs.
export interface FileListItem extends DashboardItem {
  file: ItemFile | null;
}

// A file as read for a user whose plan no longer gives it: read only by the
// locked files service, because the key never leaves the server.
export interface LockedFileRecord {
  id: string;
  title: string;
  fileKey: string | null;
  fileName: string | null;
  fileSize: number | null;
}

// A row of the locked files page: download only, so there is no view URL.
export interface LockedFile {
  id: string;
  title: string;
  fileName: string;
  size: number;
  downloadUrl: string;
}

// ItemDetail as it arrives from GET /api/items/[id]: dates become ISO strings.
// An item of a collection as read, with its upload: read only by the
// collection listing service, because the key never leaves the server.
export interface CollectionItemRecord extends UploadItemRecord {
  canCopy: boolean;
}

interface CollectionSectionFields {
  type: ItemTypeInfo;
  /** Items of this type in the whole collection, not only on this page. */
  totalCount: number;
}

// The items of one type on a page of a collection, listed the way its type page
// lists them.
export type CollectionSection = CollectionSectionFields &
  (
    | { listing: "gallery"; items: GalleryItem[] }
    | { listing: "files"; items: FileListItem[] }
    | { listing: "cards"; items: ItemCardData[] }
  );

export interface CollectionListing {
  itemCount: number;
  page: number;
  totalPages: number;
  sections: CollectionSection[];
}

export type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

// The answer of GET /api/items/[id]. The plan stays beside the detail, not in
// it: a save replaces the detail with the action's, which carries no plan.
export interface OpenedItemJson {
  item: ItemDetailJson;
  /** Pro: the forms offer the AI features. */
  canUseAi: boolean;
}

// What the update service reads before it writes: the type decides the editable
// fields, and only collections not yet linked are checked and added.
export interface ItemEditState {
  typeName: string;
  collectionIds: string[];
}

export interface ItemStats {
  total: number;
  favorites: number;
}

// The upload of an exported item: a presigned download link, never the bytes
// (ADR 0019). Null on a plan that does not give the file.
export interface ExportedItemFile {
  name: string;
  size: number | null;
  downloadUrl: string | null;
}

// An item as the export file writes it, with no object key.
export interface ExportedItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  collectionIds: string[];
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  file: ExportedItemFile | null;
}

// One page of the export; nextCursor is null on the last page.
export interface ExportedItemPage {
  items: ExportedItem[];
  nextCursor: string | null;
}

// What makes an item the same as another for an import: the fields its type
// stores, as stored.
export interface ItemIdentity {
  typeName: string;
  title: string;
  content: string | null;
  url: string | null;
}
