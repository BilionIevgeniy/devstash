import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import ItemsByTypeLoading from "@/app/(app)/items/[type]/loading";
import { PaginationNav } from "@/components/common/PaginationNav";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import {
  parseTypeSlug,
  typeSlug,
} from "@/features/item-types/domain/item-type";
import { getItemTypeByName } from "@/features/item-types/queries";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";
import { FileList } from "@/features/items/components/FileList";
import { ImageGallery } from "@/features/items/components/ImageGallery";
import {
  isCreatableType,
  typeListing,
} from "@/features/items/domain/item-fields";
import { ItemList } from "@/features/items/components/ItemList";
import { getItemsByType } from "@/features/items/queries";
import { getUserFileListItems } from "@/features/items/services/file-list";
import { getUserGalleryItems } from "@/features/items/services/gallery";
import { userCanUseType } from "@/features/items/services/type-access";
import type {
  FileListItem,
  GalleryItem,
  ItemCardData,
} from "@/features/items/types";
import { type Paginated, parsePage } from "@/lib/pagination";

type Listing =
  | ({ kind: "gallery" } & Paginated<GalleryItem>)
  | ({ kind: "files" } & Paginated<FileListItem>)
  | ({ kind: "cards" } & Paginated<ItemCardData>);

// An image type shows its items as thumbnails, a file type as rows of files,
// every other type as cards.
async function loadListing(
  userId: string,
  typeId: string,
  typeName: string,
  page: number,
): Promise<Listing> {
  switch (typeListing(typeName)) {
    case "gallery":
      return {
        kind: "gallery",
        ...(await getUserGalleryItems(userId, typeId, page)),
      };
    case "files":
      return {
        kind: "files",
        ...(await getUserFileListItems(userId, typeId, page)),
      };
    case "cards":
      return {
        kind: "cards",
        ...(await getItemsByType(userId, typeId, page)),
      };
  }
}

interface ItemsByTypeContentProps {
  slug: string;
  typeName: string;
  page: number;
}

async function ItemsByTypeContent({
  slug,
  typeName,
  page,
}: ItemsByTypeContentProps) {
  const { id: userId } = await getSessionUser();
  const type = await getItemTypeByName(typeName);
  if (!type) notFound();

  const [list, { isPro }] = await Promise.all([
    loadListing(userId, type.id, type.name, page),
    getEntitlements(userId),
  ]);
  const itemLabel = list.totalCount === 1 ? "item" : "items";
  const emptyMessage = `No ${typeSlug(type.name)} yet.`;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold capitalize">
            <TypeIcon
              name={type.icon}
              className="size-7"
              style={{ color: type.color }}
            />
            {typeSlug(type.name)}
          </h1>
          <p className="text-muted-foreground">
            {list.totalCount} {itemLabel}
          </p>
        </div>
        {isCreatableType(type.name) && (
          <CreateItemDialog defaultType={type.name} isPro={isPro} />
        )}
      </header>
      {list.kind === "gallery" && (
        <ImageGallery items={list.items} emptyMessage={emptyMessage} />
      )}
      {list.kind === "files" && (
        <FileList items={list.items} emptyMessage={emptyMessage} />
      )}
      {list.kind === "cards" && (
        <ItemList items={list.items} emptyMessage={emptyMessage} />
      )}
      <PaginationNav
        basePath={`/items/${slug}`}
        page={list.page}
        totalPages={list.totalPages}
      />
    </div>
  );
}

// loading.tsx does not show when only the query string changes, since the
// segment stays the same: the key gives each page its own loading state.
export default async function ItemsByTypePage({
  params,
  searchParams,
}: PageProps<"/items/[type]">) {
  const { type: slug } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  if (!(await userCanUseType(userId, typeName))) {
    redirect(UPGRADE_PATH);
  }

  const page = parsePage((await searchParams).page);

  return (
    <Suspense key={page} fallback={<ItemsByTypeLoading />}>
      <ItemsByTypeContent slug={slug} typeName={typeName} page={page} />
    </Suspense>
  );
}
