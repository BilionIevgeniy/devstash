import {
  FAVORITE_ROW_WRAPPER,
  FavoriteRow,
} from "@/app/(app)/favorites/_components/FavoriteRow";
import { FavoriteSection } from "@/app/(app)/favorites/_components/FavoriteSection";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import type { FavoriteItem } from "@/features/items/types";

interface FavoriteItemsProps {
  items: FavoriteItem[];
}

export function FavoriteItems({ items }: FavoriteItemsProps) {
  if (items.length === 0) return null;

  return (
    <FavoriteSection title="Items" count={items.length}>
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
