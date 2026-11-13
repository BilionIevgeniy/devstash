import { Calendar, Folder } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { DrawerSection } from "@/features/items/_internal/components/DrawerSection";
import type { ItemDetailJson } from "@/features/items/types";

interface ItemMetaProps {
  detail: ItemDetailJson;
  /** Off in the edit form, where the collections have their own input. */
  showCollections?: boolean;
}

const MINUTE_MS = 60_000;

// Read-only: the collections in the detail, and the dates in both the detail
// and the edit form.
export function ItemMeta({ detail, showCollections = true }: ItemMetaProps) {
  const t = useTranslations("items");
  return (
    <>
      {showCollections && detail.collections.length > 0 && (
        <DrawerSection title={t("fields.collections")} icon={Folder}>
          <div className="flex flex-wrap gap-2">
            {detail.collections.map((collection) => (
              <Badge key={collection.id} variant="outline">
                {collection.name}
              </Badge>
            ))}
          </div>
        </DrawerSection>
      )}
      <DrawerSection title={t("drawer.details")} icon={Calendar}>
        <dl className="space-y-1">
          <DetailRow label={t("drawer.created")} value={detail.createdAt} />
          <DetailRow
            label={t("drawer.updated")}
            value={detail.updatedAt}
            relative
          />
        </dl>
      </DrawerSection>
    </>
  );
}

interface DetailRowProps {
  label: string;
  /** An ISO date. */
  value: string;
  /** Shown as "2 hours ago", with the date itself as the title. */
  relative?: boolean;
}

// A date in the numeric form of the locale (11/10/2026, 10.11.2026), or as a
// time ago that follows the clock. The server and the browser may disagree on
// "now" by a minute, so the text may change on hydration.
function DetailRow({ label, value, relative = false }: DetailRowProps) {
  const format = useFormatter();
  const now = useNow({ updateInterval: MINUTE_MS });
  const date = new Date(value);
  const numeric = format.dateTime(date, "numeric");

  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <time
          dateTime={value}
          title={relative ? numeric : undefined}
          suppressHydrationWarning
        >
          {relative ? format.relativeTime(date, now) : numeric}
        </time>
      </dd>
    </div>
  );
}
