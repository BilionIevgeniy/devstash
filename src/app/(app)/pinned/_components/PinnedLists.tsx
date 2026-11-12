"use client";

import { useState } from "react";

import { useRowFocus } from "@/app/(app)/_components/hooks/use-row-focus";
import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { PINNED_SORT_ROW } from "@/app/(app)/pinned/_components/PinnedGroupSkeleton";
import { PinnedGroup } from "@/app/(app)/pinned/_components/PinnedGroup";
import { useSearchParam } from "@/components/common/hooks/use-search-param";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { visibleListItems } from "@/features/items/domain/list-rows";
import {
  groupPinnedItems,
  PINNED_ITEM_SORTS,
  sortPinnedItems,
} from "@/features/items/domain/pinned-items";
import { pinnedItemSortSchema } from "@/features/items/schemas";
import type { DashboardItem } from "@/features/items/types";

interface PinnedListsProps {
  items: DashboardItem[];
}

// One sort for every group, in the URL (?sort=, feature 7), applied here in
// memory. Which groups are closed lives here, not in the groups, so a group
// stays closed when its last pin leaves and comes back through the open
// drawer. An item being deleted or unpinned is left out, so its group and the
// empty state do not wait for the refresh.
export function PinnedLists({ items }: PinnedListsProps) {
  const { hiddenIds, pinOverrides } = useItemDrawer();
  const [sortValue, setSortValue] = useSearchParam("sort", "newest");
  const sort = pinnedItemSortSchema.parse(sortValue);
  const [closedTypeIds, setClosedTypeIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  function toggleGroup(typeId: string) {
    setClosedTypeIds((current) => {
      const next = new Set(current);
      if (!next.delete(typeId)) next.add(typeId);
      return next;
    });
  }

  const visibleItems = visibleListItems(items, hiddenIds, pinOverrides);
  const groups = groupPinnedItems(visibleItems);
  const { listRef, handleFocus } = useRowFocus(visibleItems.length);

  return (
    <div ref={listRef} onFocusCapture={handleFocus} className="space-y-8">
      {groups.length === 0 && (
        <p
          data-list-empty
          tabIndex={-1}
          className="text-sm text-muted-foreground outline-none"
        >
          No pinned items yet.
        </p>
      )}
      {groups.length > 0 && (
        <div className={PINNED_SORT_ROW}>
          <SortSelect
            sorts={PINNED_ITEM_SORTS}
            value={sort}
            onChange={setSortValue}
            ariaLabel="Sort pins"
          />
        </div>
      )}
      {groups.map(({ type, items: groupItems }) => (
        <PinnedGroup
          key={type.id}
          type={type}
          items={sortPinnedItems(groupItems, sort)}
          isOpen={!closedTypeIds.has(type.id)}
          onToggle={() => toggleGroup(type.id)}
        />
      ))}
    </div>
  );
}
