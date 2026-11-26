import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CollectionSections } from "@/app/(app)/collections/[id]/_components/CollectionSections";
import { PaginationNav } from "@/components/common/lists/PaginationNav";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { CollectionHeaderActions } from "@/features/collections/components/CollectionHeaderActions";
import { getCollectionById } from "@/features/collections/queries/list";
import { collectionIdSchema } from "@/features/collections/schemas";
import { ItemDrawerProvider } from "@/features/items/components/drawer/ItemDrawerProvider";
import { getUserCollectionListing } from "@/features/items/services/collection-listing";
import { parsePage } from "@/lib/pagination";

// The collection's name, from the read the page makes too (cache()).
export async function generateMetadata({
  params,
}: PageProps<"/collections/[id]">): Promise<Metadata> {
  const parsedId = collectionIdSchema.safeParse((await params).id);
  if (!parsedId.success) return {};
  const { id: userId } = await getSessionUser();
  const collection = await getCollectionById(userId, parsedId.data);
  return collection ? { title: collection.name } : {};
}

// No Suspense: a page change is a navigation in a transition, so the header
// and the pagination stay, with the focus on the link that was used, and the
// sections dim until the next page commits; the first load shows loading.tsx.
export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/collections/[id]">) {
  const parsedId = collectionIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  const id = parsedId.data;

  const [{ id: userId }, { page }, t] = await Promise.all([
    getSessionUser(),
    searchParams,
    getTranslations("common"),
  ]);
  const [collection, listing, { isPro }] = await Promise.all([
    getCollectionById(userId, id),
    getUserCollectionListing(userId, id, parsePage(page)),
    getEntitlements(userId),
  ]);
  if (!collection) notFound();

  return (
    <div className="group/list space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold wrap-break-word">
            {collection.name}
          </h1>
          <p className="text-muted-foreground">
            {t("itemCount", { count: listing.itemCount })}
          </p>
          <p className="mt-1 min-h-5 text-sm wrap-break-word text-muted-foreground">
            {collection.description}
          </p>
        </div>
        <CollectionHeaderActions collection={collection} />
      </header>
      {/* Around the empty state too: the last item leaving through the open
          drawer must not unmount the drawer's sheet. */}
      <div className="transition-opacity group-has-data-pending/list:opacity-50">
        <ItemDrawerProvider lockProItems={!isPro}>
          <CollectionSections sections={listing.sections} />
        </ItemDrawerProvider>
      </div>
      <PaginationNav
        basePath={`/collections/${id}`}
        page={listing.page}
        totalPages={listing.totalPages}
      />
    </div>
  );
}
