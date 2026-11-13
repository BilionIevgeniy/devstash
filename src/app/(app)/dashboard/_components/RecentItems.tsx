import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ItemCardTrigger } from "@/features/items/components/ItemCardTrigger";
import { ItemRow } from "@/features/items/components/ItemRow";
import { getRecentItems } from "@/features/items/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

export async function RecentItems() {
  const t = await getTranslations("pages.dashboard");
  const { id: userId } = await getSessionUser();
  const items = await getRecentItems(userId);

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Clock className="size-4 text-muted-foreground" />
        {t("recentItems")}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noItems")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCardTrigger key={item.id} item={item}>
              <ItemRow item={item} />
            </ItemCardTrigger>
          ))}
        </div>
      )}
    </section>
  );
}
