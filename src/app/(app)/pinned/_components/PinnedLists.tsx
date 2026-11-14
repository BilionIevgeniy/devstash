"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useState } from "react";

import { useRowFocus } from "@/app/(app)/_components/hooks/use-row-focus";
import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { PINNED_SORT_ROW } from "@/app/(app)/pinned/_components/PinnedGroupSkeleton";
import { PinnedGroup } from "@/app/(app)/pinned/_components/PinnedGroup";
import { useScrollRestore } from "@/components/common/hooks/use-scroll-restore";
import { useSearchParam } from "@/components/common/hooks/use-search-param";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { pendingRemovals } from "@/features/items/domain/list-rows";
import { PINNED_ITEM_SORTS } from "@/features/items/domain/pinned-items";
import { pinnedItemSortSchema } from "@/features/items/schemas";
import type { PinnedGroupPage } from "@/features/items/types";

interface PinnedListsProps {
  groups: PinnedGroupPage[];
}

// One sort for every group, in the URL (?sort=, feature 7); each group reads
// its own pages in it (ADR 0025). Which groups are closed lives here, not in
// the groups, so a group stays closed when its last pin leaves and comes back
// through the open drawer. The empty state follows every pin, less the ones
// leaving at once, so it does not wait for the refresh.
export function PinnedLists({ groups }: PinnedListsProps) {
  const t = useTranslations("pages.pinned");
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

  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const leaving = pendingRemovals(
    [...hiddenIds].map((id) => ({ id })),
    hiddenIds,
    pinOverrides,
  );
  const isEmpty = total - leaving <= 0;
  const { listRef, handleFocus } = useRowFocus(total - leaving);
  const { bfcacheId } = useRouter();
  useScrollRestore(listRef, `pinned:${bfcacheId}`);

  return (
    <div ref={listRef} onFocusCapture={handleFocus} className="space-y-8">
      {isEmpty && (
        <p
          data-list-empty
          tabIndex={-1}
          className="text-sm text-muted-foreground outline-none"
        >
          {t("empty")}
        </p>
      )}
      {!isEmpty && (
        <div className={PINNED_SORT_ROW}>
          <SortSelect
            sorts={PINNED_ITEM_SORTS}
            value={sort}
            onChange={setSortValue}
            ariaLabel={t("sort")}
          />
        </div>
      )}
      {groups.map((group) => (
        <PinnedGroup
          key={group.type.id}
          group={group}
          sort={sort}
          isOpen={!closedTypeIds.has(group.type.id)}
          onToggle={() => toggleGroup(group.type.id)}
        />
      ))}
    </div>
  );
}
