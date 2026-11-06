import Link from "next/link";

import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import {
  DISABLED_ROW_CLASS,
  ItemCount,
  LINK_CLASS,
} from "@/features/app-shell/_internal/components/sidebar/shared";
import { ProBadge } from "@/features/billing/components/ProBadge";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import { canUseType, requiresPro } from "@/features/items/domain/item-fields";
import type { SidebarItemType } from "@/features/item-types/types";

interface TypesSectionProps {
  itemTypes: SidebarItemType[];
  isPro: boolean;
}

function TypeRowContent({ type }: { type: SidebarItemType }) {
  return (
    <>
      <TypeIcon
        name={type.icon}
        className="size-4"
        style={{ color: type.color }}
      />
      <span className="capitalize">{typeSlug(type.name)}</span>
      {requiresPro(type.name) && <ProBadge />}
      <ItemCount value={type.itemCount} />
    </>
  );
}

// A type the plan does not give stays in the list with its count, not as a link.
export function TypesSection({ itemTypes, isPro }: TypesSectionProps) {
  return (
    <CollapsibleSection title="Types">
      <ul>
        {itemTypes.map((type) => (
          <li key={type.id}>
            {canUseType(type.name, isPro) ? (
              <Link
                href={`/items/${typeSlug(type.name)}`}
                className={LINK_CLASS}
              >
                <TypeRowContent type={type} />
              </Link>
            ) : (
              <div aria-disabled="true" className={DISABLED_ROW_CLASS}>
                <TypeRowContent type={type} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
