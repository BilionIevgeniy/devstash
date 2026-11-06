import Link from "next/link";

import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import {
  ItemCount,
  LINK_CLASS,
} from "@/features/app-shell/_internal/components/sidebar/shared";
import { ProBadge } from "@/features/billing/components/ProBadge";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import { canUseType, requiresPro } from "@/features/items/domain/item-fields";
import type { SidebarItemType } from "@/features/item-types/types";

interface TypesSectionProps {
  itemTypes: SidebarItemType[];
  isPro: boolean;
}

// A type the plan does not give links straight to the upgrade page: its own
// page would only redirect there, past a skeleton of a list.
export function TypesSection({ itemTypes, isPro }: TypesSectionProps) {
  return (
    <CollapsibleSection title="Types">
      <ul>
        {itemTypes.map((type) => (
          <li key={type.id}>
            <Link
              href={
                canUseType(type.name, isPro)
                  ? `/items/${typeSlug(type.name)}`
                  : UPGRADE_PATH
              }
              className={LINK_CLASS}
            >
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
