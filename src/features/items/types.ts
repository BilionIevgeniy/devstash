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

// ItemDetail as it arrives from GET /api/items/[id]: dates become ISO strings.
// An item of a collection as read, with its upload: read only by the
// collection listing service, because the key never leaves the server.
export interface CollectionItemRecord extends UploadItemRecord {
  canCopy: boolean;
}

// The items of one type in a collection, listed the way its type page lists them.
export type CollectionSection =
  | { listing: "gallery"; type: ItemTypeInfo; items: GalleryItem[] }
  | { listing: "files"; type: ItemTypeInfo; items: FileListItem[] }
  | { listing: "cards"; type: ItemTypeInfo; items: ItemCardData[] };

export interface CollectionListing {
  itemCount: number;
  sections: CollectionSection[];
}

export type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

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
