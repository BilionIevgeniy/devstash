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
export type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export interface ItemStats {
  total: number;
  favorites: number;
}
