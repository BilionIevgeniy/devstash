import { PinnedLists } from "@/app/(app)/pinned/_components/PinnedLists";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { getAllPinnedItems } from "@/features/items/queries";

export default async function PinnedPage() {
  const { id: userId } = await getSessionUser();
  const [items, { isPro }] = await Promise.all([
    getAllPinnedItems(userId),
    getEntitlements(userId),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Pinned</h1>
        <p className="text-muted-foreground">Your pinned items, by type</p>
      </header>
      {/* Around the empty state too: the last pin leaving through the open
          drawer must not unmount the drawer's sheet. */}
      <ItemDrawerProvider lockProItems={!isPro}>
        <PinnedLists items={items} />
      </ItemDrawerProvider>
    </div>
  );
}
