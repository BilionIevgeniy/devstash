import { FavoriteLists } from "@/app/(app)/favorites/_components/FavoriteLists";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getFavoriteCollections } from "@/features/collections/queries";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { getFavoriteItems } from "@/features/items/queries";

export default async function FavoritesPage() {
  const { id: userId } = await getSessionUser();
  const [items, collections] = await Promise.all([
    getFavoriteItems(userId),
    getFavoriteCollections(userId),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Favorites</h1>
        <p className="text-muted-foreground">
          Your starred items and collections
        </p>
      </header>
      {/* Around the empty state too: the last favorite leaving through the open
          drawer must not unmount the drawer's sheet. */}
      <ItemDrawerProvider>
        <FavoriteLists items={items} collections={collections} />
      </ItemDrawerProvider>
    </div>
  );
}
