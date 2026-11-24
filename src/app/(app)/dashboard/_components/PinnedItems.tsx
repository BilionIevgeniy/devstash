import { Pin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ItemCardTrigger } from "@/features/items/components/cards/ItemCardTrigger";
import { ItemRow } from "@/features/items/components/cards/ItemRow";
import { getPinnedItems } from "@/features/items/queries/dashboard";
import { getSessionUser } from "@/features/auth/nextauth/session";

export async function PinnedItems() {
  const t = await getTranslations("pages.dashboard");
  const { id: userId } = await getSessionUser();
  const items = await getPinnedItems(userId);

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Pin className="size-4 text-muted-foreground" />
        {t("pinned")}
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <ItemCardTrigger key={item.id} item={item}>
            <ItemRow item={item} />
          </ItemCardTrigger>
        ))}
      </div>
    </section>
  );
}
