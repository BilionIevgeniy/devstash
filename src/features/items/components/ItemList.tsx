import { ItemCard } from "@/features/items/components/ItemCard";
import type { DashboardItem } from "@/features/items/types";

interface ItemListProps {
  items: DashboardItem[];
  emptyMessage: string;
}

export function ItemList({ items, emptyMessage }: ItemListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
