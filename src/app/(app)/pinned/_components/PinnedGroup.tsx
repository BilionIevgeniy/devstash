import { ChevronDown } from "lucide-react";
import { typeLabel } from "@/features/item-types/domain/item-type";
import { useTranslations } from "next-intl";

import { LIST_ROW_WRAPPER, ListRow } from "@/app/(app)/_components/ListRow";
import { ListRowFrame } from "@/app/(app)/_components/ListRowFrame";
import { PINNED_GROUP_HEADER } from "@/app/(app)/pinned/_components/PinnedGroupSkeleton";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import type { ItemTypeInfo } from "@/features/item-types/types";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import { ItemRowActions } from "@/features/items/components/ItemRowActions";
import type { DashboardItem } from "@/features/items/types";
import { cn } from "@/lib/utils";

interface PinnedGroupProps {
  type: ItemTypeInfo;
  items: DashboardItem[];
  isOpen: boolean;
  onToggle: () => void;
}

// The panel stays in the DOM while closed, so aria-controls always has a target.
export function PinnedGroup({
  type,
  items,
  isOpen,
  onToggle,
}: PinnedGroupProps) {
  const typeName = useTranslations("itemTypes");
  const label = typeLabel(typeName, type.name, "other");
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
              <span>{label}</span>{" "}
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
      </div>
      <div id={panelId} hidden={!isOpen}>
        {items.map((item) => (
          <ListRowFrame
            key={item.id}
            actions={<ItemRowActions item={item} removes="pin" />}
          >
            <ItemDrawerTrigger item={item} className={LIST_ROW_WRAPPER}>
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
          </ListRowFrame>
        ))}
      </div>
    </section>
  );
}
