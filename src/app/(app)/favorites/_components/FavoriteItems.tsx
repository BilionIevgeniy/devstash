import {
  FAVORITE_ROW_WRAPPER,
  FavoriteRow,
} from "@/app/(app)/favorites/_components/FavoriteRow";
import { FavoriteSection } from "@/app/(app)/favorites/_components/FavoriteSection";
import { FavoriteSortSelect } from "@/app/(app)/favorites/_components/FavoriteSortSelect";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
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
        <FavoriteSortSelect
          sorts={FAVORITE_ITEM_SORTS}
          value={sort}
          onChange={onSortChange}
          ariaLabel="Sort items"
        />
      }
    >
      {items.map((item) => (
        <ItemDrawerTrigger
          key={item.id}
          item={item}
          className={FAVORITE_ROW_WRAPPER}
        >
          <FavoriteRow
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
      ))}
    </FavoriteSection>
  );
}
