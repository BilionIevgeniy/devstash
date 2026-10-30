import Link from "next/link";

import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import {
  ItemCount,
  LINK_CLASS,
} from "@/features/app-shell/_internal/components/sidebar/shared";
import { ProBadge } from "@/features/billing/components/ProBadge";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import { requiresPro } from "@/features/items/domain/item-fields";
import type { SidebarItemType } from "@/features/item-types/types";

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
              {requiresPro(type.name) && <ProBadge />}
              <ItemCount value={type.itemCount} />
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
