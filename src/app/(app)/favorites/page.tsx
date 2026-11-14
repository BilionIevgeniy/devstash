import { FavoriteLists } from "@/app/(app)/favorites/_components/FavoriteLists";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { getFavoriteCollections } from "@/features/collections/queries";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { getFavoriteItems } from "@/features/items/queries";

export default async function FavoritesPage() {
  const t = await getTranslations("pages.favorites");
  const { id: userId } = await getSessionUser();
  const [items, collections, { isPro }] = await Promise.all([
    getFavoriteItems(userId),
    getFavoriteCollections(userId),
    getEntitlements(userId),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      {/* Around the empty state too: the last favorite leaving through the open
          drawer must not unmount the drawer's sheet. */}
      <ItemDrawerProvider lockProItems={!isPro}>
        <FavoriteLists items={items} collections={collections} />
      </ItemDrawerProvider>
    </div>
  );
}
