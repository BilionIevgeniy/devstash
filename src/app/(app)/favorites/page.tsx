import { PageHeader } from "@/app/(app)/_components/PageHeader";
import { FavoriteLists } from "@/app/(app)/favorites/_components/FavoriteLists";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { getFavoriteCollections } from "@/features/collections/queries/favorites";
import { ItemDrawerProvider } from "@/features/items/components/drawer/ItemDrawerProvider";
import {
  countFavoriteItems,
  getFavoriteFirstPage,
} from "@/features/items/queries/lists";
import { favoriteItemSortSchema } from "@/features/items/schemas";

// The first page of items comes from here, for the sort in the URL; the next
// ones are fetched by the list as it scrolls (ADR 0025). The collections stay
// one full list.
export default async function FavoritesPage({
  searchParams,
}: PageProps<"/favorites">) {
  const { id: userId } = await getSessionUser();
  const itemSort = favoriteItemSortSchema.parse((await searchParams).itemSort);
  const [first, count, collections, { isPro }] = await Promise.all([
    getFavoriteFirstPage(userId, itemSort),
    countFavoriteItems(userId),
    getFavoriteCollections(userId),
    getEntitlements(userId),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader namespace="pages.favorites" />
      {/* Around the empty state too: the last favorite leaving through the open
          drawer must not unmount the drawer's sheet. */}
      <ItemDrawerProvider lockProItems={!isPro}>
        <FavoriteLists
          first={first}
          itemCount={count}
          collections={collections}
        />
      </ItemDrawerProvider>
    </div>
  );
}
