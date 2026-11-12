import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { ItemListFilters } from "@/app/(app)/items/[type]/_components/ItemListFilters";
import { ItemsHeader } from "@/app/(app)/items/[type]/_components/ItemsHeader";
import { ItemsListing } from "@/app/(app)/items/[type]/_components/ItemsListing";
import { ListingSkeleton } from "@/app/(app)/items/[type]/_components/ListingSkeleton";
import { PaginationNav } from "@/components/common/PaginationNav";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { parseTypeSlug } from "@/features/item-types/domain/item-type";
import { getItemTypeByName } from "@/features/item-types/queries";
import { typeListing } from "@/features/items/domain/item-fields";
import { itemListHref } from "@/features/items/domain/list-params";
import { ITEMS_PER_PAGE } from "@/features/items/domain/pagination";
import { countItemsOfType, getTypeTagNames } from "@/features/items/queries";
import { parseItemListParams } from "@/features/items/schemas";
import { userCanUseType } from "@/features/items/services/type-access";
import { pagePosition } from "@/lib/pagination";

// The URL holds the view: ?sort=&tag=&page= (feature 7). The header, the
// filters and the pagination read the count and stay outside the Suspense, so
// they keep their place and their focus while the rows change. The boundary
// has no key: every change here is a navigation in a transition, which keeps
// the rows on screen, dimmed through `group-has-data-pending/list:` (the
// filters and the page links set data-pending), until the new ones are ready.
// The group is named: an unnamed one would match every `group-hover:` below it,
// such as the zoom of each gallery card. The filters show for an empty type
// too, so the skeleton of loading.tsx fits every type. The first load and a
// change of type show loading.tsx.
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

  const type = await getItemTypeByName(typeName);
  if (!type) notFound();

  const requested = parseItemListParams(await searchParams);
  const [totalCount, tags, { isPro }] = await Promise.all([
    countItemsOfType(userId, type.id, requested.tag),
    getTypeTagNames(userId, type.id),
    getEntitlements(userId),
  ]);
  const position = pagePosition(totalCount, ITEMS_PER_PAGE, requested.page);
  const current = { ...requested, page: position.page };
  const basePath = `/items/${slug}`;
  return (
    <div className="group/list space-y-8">
      <ItemsHeader type={type} totalCount={totalCount} isPro={isPro} />
      <div className="space-y-4">
        <ItemListFilters basePath={basePath} params={current} tags={tags} />
        <div className="transition-opacity group-has-data-pending/list:opacity-50">
          <Suspense
            fallback={<ListingSkeleton listing={typeListing(type.name)} />}
          >
            <ItemsListing
              userId={userId}
              type={type}
              params={current}
              totalCount={totalCount}
              basePath={basePath}
            />
          </Suspense>
        </div>
      </div>
      <PaginationNav
        basePath={basePath}
        page={position.page}
        totalPages={position.totalPages}
        hrefFor={(page) => itemListHref(basePath, current, { page })}
      />
    </div>
  );
}
