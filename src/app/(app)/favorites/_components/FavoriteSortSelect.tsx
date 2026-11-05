import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FavoriteItemSort } from "@/features/items/domain/favorite-sort";

// Shared with loading.tsx, so the skeleton is as wide as the control.
export const FAVORITE_SORT_WIDTH = "w-36";

// The sorts of collections are a subset of these.
const SORT_LABELS: Record<FavoriteItemSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  "a-z": "A-Z",
  "z-a": "Z-A",
  type: "Item type",
};

interface FavoriteSortSelectProps<T extends FavoriteItemSort> {
  sorts: readonly T[];
  value: T;
  onChange: (sort: T) => void;
  ariaLabel: string;
}

export function FavoriteSortSelect<T extends FavoriteItemSort>({
  sorts,
  value,
  onChange,
  ariaLabel,
}: FavoriteSortSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger aria-label={ariaLabel} className={FAVORITE_SORT_WIDTH}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sorts.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
