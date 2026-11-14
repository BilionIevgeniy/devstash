import { LIST_ROW_WRAPPER, ListRow } from "@/app/(app)/_components/ListRow";
import { ListRowFrame } from "@/app/(app)/_components/ListRowFrame";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import { ItemRowActions } from "@/features/items/components/ItemRowActions";
import type { DashboardItem } from "@/features/items/types";

interface PinnedGroupRowsProps {
  items: DashboardItem[];
}

// The rows of one group of /pinned: an unpin takes the row off and offers Undo.
export function PinnedGroupRows({ items }: PinnedGroupRowsProps) {
  return items.map((item) => (
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
  ));
}
