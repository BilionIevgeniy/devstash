import { ItemCard } from "@/features/items/components/ItemCard";
import { ItemCardTrigger } from "@/features/items/components/ItemCardTrigger";
import type { ItemCardData } from "@/features/items/types";

interface ItemListProps {
  items: ItemCardData[];
  emptyMessage: string;
}

export function ItemList({ items, emptyMessage }: ItemListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <ItemCardTrigger key={item.id} item={item}>
          <ItemCard item={item} />
        </ItemCardTrigger>
      ))}
    </div>
  );
}
