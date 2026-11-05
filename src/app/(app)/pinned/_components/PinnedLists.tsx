"use client";

import { useState } from "react";

import { useRowFocus } from "@/app/(app)/_components/hooks/use-row-focus";
import { PinnedGroup } from "@/app/(app)/pinned/_components/PinnedGroup";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { visibleListItems } from "@/features/items/domain/list-rows";
import {
  groupPinnedItems,
  sortPinnedItems,
  type PinnedItemSort,
} from "@/features/items/domain/pinned-items";
import type { DashboardItem } from "@/features/items/types";

interface GroupState {
  sort: PinnedItemSort;
  isOpen: boolean;
}

const DEFAULT_GROUP_STATE: GroupState = { sort: "newest", isOpen: true };

interface PinnedListsProps {
  items: DashboardItem[];
}

// The groups' state lives here, not in the groups, so a group keeps it when its
// last pin leaves and comes back through the open drawer. An item being deleted
// or unpinned is left out, so its group and the empty state do not wait for the
// refresh.
export function PinnedLists({ items }: PinnedListsProps) {
  const { hiddenIds, pinOverrides } = useItemDrawer();
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>(
    {},
  );

  function updateGroup(typeId: string, change: Partial<GroupState>) {
    setGroupStates((current) => ({
      ...current,
      [typeId]: { ...DEFAULT_GROUP_STATE, ...current[typeId], ...change },
    }));
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
      {groups.map(({ type, items: groupItems }) => {
        const { sort, isOpen } = groupStates[type.id] ?? DEFAULT_GROUP_STATE;

        return (
          <PinnedGroup
            key={type.id}
            type={type}
            items={sortPinnedItems(groupItems, sort)}
            sort={sort}
            isOpen={isOpen}
            onSortChange={(next) => updateGroup(type.id, { sort: next })}
            onToggle={() => updateGroup(type.id, { isOpen: !isOpen })}
          />
        );
      })}
    </div>
  );
}
