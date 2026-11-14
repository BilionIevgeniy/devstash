import { PinnedLists } from "@/app/(app)/pinned/_components/PinnedLists";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getEntitlements } from "@/features/billing/queries";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { getPinnedFirstPages } from "@/features/items/queries/lists";
import { pinnedItemSortSchema } from "@/features/items/schemas";

// Every type with pins as a group, each with its count and its first page for
// the sort in the URL; a group shows more on request (ADR 0025).
export default async function PinnedPage({
  searchParams,
}: PageProps<"/pinned">) {
  const t = await getTranslations("pages.pinned");
  const { id: userId } = await getSessionUser();
  const sort = pinnedItemSortSchema.parse((await searchParams).sort);
  const [groups, { isPro }] = await Promise.all([
    getPinnedFirstPages(userId, sort),
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
        <PinnedLists groups={groups} />
      </ItemDrawerProvider>
    </div>
  );
}
