import { getTranslations } from "next-intl/server";

import { titleOf } from "@/app/page-title";
import { PaginationNav } from "@/components/common/lists/PaginationNav";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { CollectionCard } from "@/features/collections/components/CollectionCard";
import { getUserCollections } from "@/features/collections/queries/list";
import { parsePage } from "@/lib/pagination";

export const generateMetadata = titleOf("pages.collections");

// One read for the count and the rows. No Suspense: a page change is a
// navigation in a transition, so the header and the pagination stay, with the
// focus on the link that was used, and the rows dim (`group-has-data-pending/
// list:`, set by the pagination's links) until the next page commits; the
// first load shows loading.tsx.
export default async function CollectionsPage({
  searchParams,
}: PageProps<"/collections">) {
  const [t, { id: userId }, { page }] = await Promise.all([
    getTranslations("pages.collections"),
    getSessionUser(),
    searchParams,
  ]);
  const {
    items: collections,
    totalCount,
    page: currentPage,
    totalPages,
  } = await getUserCollections(userId, parsePage(page));

  return (
    <div className="group/list space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("count", { count: totalCount })}
        </p>
      </header>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 transition-opacity group-has-data-pending/list:opacity-50 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              headingLevel="h2"
            />
          ))}
        </div>
      )}
      <PaginationNav
        basePath="/collections"
        page={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}
