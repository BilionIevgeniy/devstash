import { Calendar, Folder } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DrawerSection } from "@/features/items/_internal/components/DrawerSection";
import type { ItemDetailJson } from "@/features/items/types";
import { formatLongDate } from "@/lib/utils";

// Read-only in both the detail and the edit form: collections and dates.
export function ItemMeta({ detail }: { detail: ItemDetailJson }) {
  return (
    <>
      {detail.collections.length > 0 && (
        <DrawerSection title="Collections" icon={Folder}>
          <div className="flex flex-wrap gap-2">
            {detail.collections.map((collection) => (
              <Badge key={collection.id} variant="outline">
                {collection.name}
              </Badge>
            ))}
          </div>
        </DrawerSection>
      )}
      <DrawerSection title="Details" icon={Calendar}>
        <dl className="space-y-1">
          <DetailRow label="Created" value={detail.createdAt} />
          <DetailRow label="Updated" value={detail.updatedAt} />
        </dl>
      </DrawerSection>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <time dateTime={value}>{formatLongDate(new Date(value))}</time>
      </dd>
    </div>
  );
}
