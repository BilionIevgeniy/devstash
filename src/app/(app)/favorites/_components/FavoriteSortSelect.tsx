import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FAVORITE_SORTS,
  type FavoriteSort,
} from "@/features/items/domain/favorite-sort";
import { cn } from "@/lib/utils";

// Shared with loading.tsx, so the skeleton is as wide as the control.
export const FAVORITE_SORT_WIDTH = "w-36";

const SORT_LABELS: Record<FavoriteSort, string> = {
  date: "Date",
  name: "Name",
  type: "Item type",
};

interface FavoriteSortSelectProps {
  value: FavoriteSort;
  onChange: (sort: FavoriteSort) => void;
}

export function FavoriteSortSelect({
  value,
  onChange,
}: FavoriteSortSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as FavoriteSort)}
    >
      <SelectTrigger
        aria-label="Sort favorites"
        className={cn("ml-auto", FAVORITE_SORT_WIDTH)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FAVORITE_SORTS.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
