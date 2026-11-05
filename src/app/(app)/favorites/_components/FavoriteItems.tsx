import { LIST_ROW_WRAPPER, ListRow } from "@/app/(app)/_components/ListRow";
import { ListRowFrame } from "@/app/(app)/_components/ListRowFrame";
import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { FavoriteSection } from "@/app/(app)/favorites/_components/FavoriteSection";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import { ItemRowActions } from "@/features/items/components/ItemRowActions";
import {
  FAVORITE_ITEM_SORTS,
  type FavoriteItemSort,
} from "@/features/items/domain/favorite-sort";
import type { FavoriteItem } from "@/features/items/types";

interface FavoriteItemsProps {
  items: FavoriteItem[];
  sort: FavoriteItemSort;
  onSortChange: (sort: FavoriteItemSort) => void;
}

export function FavoriteItems({
  items,
  sort,
  onSortChange,
}: FavoriteItemsProps) {
  if (items.length === 0) return null;

  return (
    <FavoriteSection
      title="Items"
      count={items.length}
      action={
        <SortSelect
          sorts={FAVORITE_ITEM_SORTS}
          value={sort}
          onChange={onSortChange}
          ariaLabel="Sort items"
        />
      }
    >
      {items.map((item) => (
        <ListRowFrame
          key={item.id}
          actions={<ItemRowActions item={item} removes="favorite" />}
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
              badge={item.type.name}
              date={item.favoritedAt}
            />
          </ItemDrawerTrigger>
        </ListRowFrame>
      ))}
    </FavoriteSection>
  );
}
