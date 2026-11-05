import { ChevronDown } from "lucide-react";

import { LIST_ROW_WRAPPER, ListRow } from "@/app/(app)/_components/ListRow";
import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import type { ItemTypeInfo } from "@/features/item-types/types";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import {
  PINNED_ITEM_SORTS,
  type PinnedItemSort,
} from "@/features/items/domain/pinned-items";
import type { DashboardItem } from "@/features/items/types";
import { cn } from "@/lib/utils";

// Shared with loading.tsx, so the title does not move when the content commits.
export const PINNED_GROUP_HEADER =
  "flex h-8 items-center justify-between gap-3";

interface PinnedGroupProps {
  type: ItemTypeInfo;
  items: DashboardItem[];
  sort: PinnedItemSort;
  isOpen: boolean;
  onSortChange: (sort: PinnedItemSort) => void;
  onToggle: () => void;
}

// The panel stays in the DOM while closed, so aria-controls always has a target.
export function PinnedGroup({
  type,
  items,
  sort,
  isOpen,
  onSortChange,
  onToggle,
}: PinnedGroupProps) {
  const label = typeSlug(type.name);
  const panelId = `pinned-group-${type.id}`;

  return (
    <section className="space-y-2">
      <div className={PINNED_GROUP_HEADER}>
        <h2 className="min-w-0 font-mono text-sm font-semibold">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={onToggle}
            className="flex h-8 items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>
              <span className="capitalize">{label}</span>{" "}
              <span className="text-muted-foreground">({items.length})</span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                !isOpen && "-rotate-90",
              )}
            />
          </button>
        </h2>
        <SortSelect
          sorts={PINNED_ITEM_SORTS}
          value={sort}
          onChange={onSortChange}
          ariaLabel={`Sort ${label}`}
        />
      </div>
      <div id={panelId} hidden={!isOpen}>
        {items.map((item) => (
          <ItemDrawerTrigger
            key={item.id}
            item={item}
            className={LIST_ROW_WRAPPER}
          >
            <ListRow
              icon={
                <TypeIcon
                  name={item.type.icon}
                  className="size-4 shrink-0"
                  style={{ color: item.type.color }}
                />
              }
              title={item.title}
              date={item.createdAt}
            />
          </ItemDrawerTrigger>
        ))}
      </div>
    </section>
  );
}
