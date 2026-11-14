import { LIST_ROW_WRAPPER, ListRow } from "@/app/(app)/_components/ListRow";
import { typeLabel } from "@/features/item-types/domain/item-type";
import { useTranslations } from "next-intl";
import { ListRowFrame } from "@/app/(app)/_components/ListRowFrame";
import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { FavoriteSection } from "@/app/(app)/favorites/_components/FavoriteSection";
import { ListPagesFrame } from "@/app/(app)/_components/ListPagesFrame";
import { LoadMore } from "@/components/common/LoadMore";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import type { ItemListPages } from "@/features/items/components/hooks/use-item-list-pages";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import { ItemRowActions } from "@/features/items/components/ItemRowActions";
import {
  FAVORITE_ITEM_SORTS,
  type FavoriteItemSort,
} from "@/features/items/domain/favorite-sort";
import type { FavoriteItem } from "@/features/items/types";

interface FavoriteItemsProps {
  /** The loaded rows that stay on the list. */
  items: FavoriteItem[];
  /** Every favorite, loaded or not, less the ones leaving at once. */
  count: number;
  pages: ItemListPages<FavoriteItem>;
  sort: FavoriteItemSort;
  onSortChange: (sort: FavoriteItemSort) => void;
  onFocusRow: (index: number) => void;
}

// The rows of the sort before stay, dimmed, while a new sort's first page
// loads; if it fails, the error and Try again take their place.
export function FavoriteItems({
  items,
  count,
  pages,
  sort,
  onSortChange,
  onFocusRow,
}: FavoriteItemsProps) {
  const typeName = useTranslations("itemTypes");
  const t = useTranslations("pages.favorites");
  if (count === 0) return null;

  return (
    <FavoriteSection
      title={t("items")}
      count={count}
      action={
        <SortSelect
          sorts={FAVORITE_ITEM_SORTS}
          value={sort}
          onChange={onSortChange}
          ariaLabel={t("sortItems")}
        />
      }
    >
      <ListPagesFrame
        isPlaceholder={pages.isPlaceholder}
        firstPageFailed={pages.firstPageFailed}
        onRetry={pages.retryFirstPage}
        more={
          <LoadMore
            rowCount={items.length}
            hasMore={pages.hasMore}
            isLoading={pages.isLoadingMore}
            failed={pages.loadMoreFailed}
            onLoad={pages.loadMore}
            onFocusRow={onFocusRow}
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
                badge={typeLabel(typeName, item.type.name, "one")}
                date={item.favoritedAt}
              />
            </ItemDrawerTrigger>
          </ListRowFrame>
        ))}
      </ListPagesFrame>
    </FavoriteSection>
  );
}
