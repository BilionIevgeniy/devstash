import { Pin } from "lucide-react";

import { ItemCardTrigger } from "@/features/items/components/ItemCardTrigger";
import { ItemRow } from "@/features/items/components/ItemRow";
import { getPinnedItems } from "@/features/items/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

export async function PinnedItems() {
  const { id: userId } = await getSessionUser();
  const items = await getPinnedItems(userId);

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Pin className="size-4 text-muted-foreground" />
        Pinned
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
