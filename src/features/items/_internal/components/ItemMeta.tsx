import { Calendar, Folder } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DrawerSection } from "@/features/items/_internal/components/DrawerSection";
import type { ItemDetailJson } from "@/features/items/types";
import { formatLongDate } from "@/lib/utils";

interface ItemMetaProps {
  detail: ItemDetailJson;
  /** Off in the edit form, where the collections have their own input. */
  showCollections?: boolean;
}

// Read-only: the collections in the detail, and the dates in both the detail
// and the edit form.
export function ItemMeta({ detail, showCollections = true }: ItemMetaProps) {
  return (
    <>
      {showCollections && detail.collections.length > 0 && (
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
