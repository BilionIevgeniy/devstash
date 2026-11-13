import { PinnedLists } from "@/app/(app)/pinned/_components/PinnedLists";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { getAllPinnedItems } from "@/features/items/queries";

export default async function PinnedPage() {
  const t = await getTranslations("pages.pinned");
  const { id: userId } = await getSessionUser();
  const [items, { isPro }] = await Promise.all([
    getAllPinnedItems(userId),
    getEntitlements(userId),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      {/* Around the empty state too: the last pin leaving through the open
          drawer must not unmount the drawer's sheet. */}
      <ItemDrawerProvider lockProItems={!isPro}>
        <PinnedLists items={items} />
      </ItemDrawerProvider>
    </div>
  );
}
