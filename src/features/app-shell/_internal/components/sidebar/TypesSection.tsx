import Link from "next/link";

import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import { ItemCount, LINK_CLASS } from "@/features/app-shell/_internal/components/sidebar/shared";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import { Badge } from "@/components/ui/badge";
import type { SidebarItemType } from "@/features/item-types/types";

const PRO_TYPE_NAMES = ["file", "image"];

function ProBadge() {
  return (
    <Badge
      variant="outline"
      className="h-4 px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"
    >
      PRO
    </Badge>
  );
}

export function TypesSection({ itemTypes }: { itemTypes: SidebarItemType[] }) {
  return (
    <CollapsibleSection title="Types">
      <ul>
        {itemTypes.map((type) => (
          <li key={type.id}>
            <Link href={`/items/${typeSlug(type.name)}`} className={LINK_CLASS}>
              <TypeIcon
                name={type.icon}
                className="size-4"
                style={{ color: type.color }}
              />
              <span className="capitalize">{typeSlug(type.name)}</span>
              {PRO_TYPE_NAMES.includes(type.name) && <ProBadge />}
              <ItemCount value={type.itemCount} />
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
