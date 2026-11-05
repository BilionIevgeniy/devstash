"use client";

import { useState } from "react";

import { PinnedGroup } from "@/app/(app)/pinned/_components/PinnedGroup";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
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
// is left out, so its group and the empty state do not wait for the refresh.
export function PinnedLists({ items }: PinnedListsProps) {
  const { hiddenIds } = useItemDrawer();
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>(
    {},
  );

  function updateGroup(typeId: string, change: Partial<GroupState>) {
    setGroupStates((current) => ({
      ...current,
      [typeId]: { ...DEFAULT_GROUP_STATE, ...current[typeId], ...change },
    }));
  }

  const groups = groupPinnedItems(
    items.filter((item) => !hiddenIds.has(item.id)),
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pinned items yet.</p>
    );
  }

  return (
    <div className="space-y-8">
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
