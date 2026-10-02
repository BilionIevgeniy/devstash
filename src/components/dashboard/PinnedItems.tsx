import { Pin } from "lucide-react";

import { ItemRow } from "@/components/dashboard/ItemRow";
import { getPinnedItems } from "@/lib/dashboard-data";

export function PinnedItems() {
  const items = getPinnedItems();

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Pin className="size-4 text-muted-foreground" />
        Pinned
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
