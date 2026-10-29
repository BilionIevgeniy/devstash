import { Clock } from "lucide-react";

import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import { ItemRow } from "@/features/items/components/ItemRow";
import { getRecentItems } from "@/features/items/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

export async function RecentItems() {
  const { id: userId } = await getSessionUser();
  const items = await getRecentItems(userId);

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Clock className="size-4 text-muted-foreground" />
        Recent Items
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemDrawerTrigger key={item.id} item={item}>
              <ItemRow item={item} />
            </ItemDrawerTrigger>
          ))}
        </div>
      )}
    </section>
  );
}
