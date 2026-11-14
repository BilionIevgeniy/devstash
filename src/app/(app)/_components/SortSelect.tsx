import { useTranslations } from "next-intl";
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

// The sorts of favorite collections and of pins are subsets of the keys of
// `pages.sort`.

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
  const t = useTranslations("pages.sort");
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger aria-label={ariaLabel} className={SORT_SELECT_WIDTH}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sorts.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {t(sort as FavoriteItemSort)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
