import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FavoriteItemSort } from "@/features/items/domain/favorite-sort";

// Shared with the loading.tsx files, so the skeleton is as wide as the control.
export const SORT_SELECT_WIDTH = "w-36";

// The sorts of favorite collections and of pins are subsets of these.
const SORT_LABELS: Record<FavoriteItemSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  "a-z": "A-Z",
  "z-a": "Z-A",
  type: "Item type",
};

interface SortSelectProps<T extends FavoriteItemSort> {
  sorts: readonly T[];
  value: T;
  onChange: (sort: T) => void;
  ariaLabel: string;
}

export function SortSelect<T extends FavoriteItemSort>({
  sorts,
  value,
  onChange,
  ariaLabel,
}: SortSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger aria-label={ariaLabel} className={SORT_SELECT_WIDTH}>
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
