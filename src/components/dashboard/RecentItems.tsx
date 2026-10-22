import { Clock } from "lucide-react";

import { ItemRow } from "@/components/dashboard/ItemRow";
import { getRecentItems } from "@/lib/db/items";
import { getSessionUser } from "@/lib/session";

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
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
