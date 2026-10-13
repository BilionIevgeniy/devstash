import { Clock } from "lucide-react";

import { ItemRow } from "@/components/dashboard/ItemRow";
import { getRecentItems } from "@/lib/db/items";

export async function RecentItems() {
  const items = await getRecentItems();

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Clock className="size-4 text-muted-foreground" />
        Recent Items
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
