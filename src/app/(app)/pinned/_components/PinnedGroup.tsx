import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { focusListRow } from "@/app/(app)/_components/hooks/use-row-focus";
import { PINNED_GROUP_HEADER } from "@/app/(app)/pinned/_components/PinnedGroupSkeleton";
import { PinnedGroupRows } from "@/app/(app)/pinned/_components/PinnedGroupRows";
import { ListPagesFrame } from "@/app/(app)/_components/ListPagesFrame";
import { ShowMore } from "@/components/common/ShowMore";
import { typeLabel } from "@/features/item-types/domain/item-type";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { usePinnedGroupPages } from "@/features/items/components/hooks/use-item-list-pages";
import { visibleListItems } from "@/features/items/domain/list-rows";
import type { PinnedItemSort } from "@/features/items/domain/pinned-items";
import type { PinnedGroupPage } from "@/features/items/types";
import { cn } from "@/lib/utils";

interface PinnedGroupProps {
  group: PinnedGroupPage;
  sort: PinnedItemSort;
  isOpen: boolean;
  onToggle: () => void;
}

// One type of /pinned, with its own pages (ADR 0025): the first from the
// server, more on Show more. A closed group renders no button, so it never
// loads. The count is the type's, less the pins leaving at once; at zero the
// group goes. The panel stays in the DOM while closed, so aria-controls always
// has a target.
export function PinnedGroup({
  group,
  sort,
  isOpen,
  onToggle,
}: PinnedGroupProps) {
  const typeName = useTranslations("itemTypes");
  const { hiddenIds, pinOverrides } = useItemDrawer();
  const pages = usePinnedGroupPages(group.type.id, sort, group.first);
  const panelRef = useRef<HTMLDivElement>(null);
  const label = typeLabel(typeName, group.type.name, "other");
  const panelId = `pinned-group-${group.type.id}`;

  // The rows of this type that are leaving at once. The server's first page
  // still names a row the cache sync already took off, until the refresh.
  const knownIds = new Set(
    [...group.first.page.rows, ...pages.rows].map(({ id }) => id),
  );
  const leaving = [...knownIds].filter(
    (id) => hiddenIds.has(id) || pinOverrides.get(id) === false,
  ).length;
  const count = group.count - leaving;
  const items = visibleListItems(pages.rows, hiddenIds, pinOverrides);
  if (count <= 0) return null;

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
              <span>{label}</span>{" "}
              <span className="text-muted-foreground">({count})</span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                !isOpen && "-rotate-90",
              )}
            />
          </button>
        </h2>
      </div>
      <div id={panelId} ref={panelRef} hidden={!isOpen}>
        <ListPagesFrame
          isPlaceholder={pages.isPlaceholder}
          firstPageFailed={pages.firstPageFailed}
          onRetry={pages.retryFirstPage}
          more={
            isOpen && (
              <ShowMore
                label="showMore"
                rowCount={items.length}
                hasMore={pages.hasMore}
                isLoading={pages.isLoadingMore}
                failed={pages.loadMoreFailed}
                onLoad={pages.loadMore}
                onFocusRow={(index) => {
                  if (panelRef.current) focusListRow(panelRef.current, index);
                }}
              />
            )
          }
        >
          <PinnedGroupRows items={items} />
        </ListPagesFrame>
      </div>
    </section>
  );
}
