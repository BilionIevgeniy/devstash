import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { useFormatter } from "next-intl";
import { PinMark } from "@/features/items/_internal/components/PinMark";
import { cn } from "@/lib/utils";
import type { ItemCardData } from "@/features/items/types";

interface ItemRowProps {
  item: ItemCardData;
}

export function ItemRow({ item }: ItemRowProps) {
  const format = useFormatter();
  const { type } = item;
  const iconBackground = type.color
    ? `color-mix(in oklab, ${type.color} 10%, transparent)`
    : undefined;

  // The padding leaves room for the buttons over the corner (ItemCardTrigger).
  return (
    <article
      className={cn(
        "flex items-start gap-4 rounded-lg border border-l-4 bg-card p-4 transition-colors hover:bg-accent/50",
        item.canCopy ? "pr-22" : "pr-14",
      )}
      style={{ borderLeftColor: type.color }}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBackground }}
      >
        <TypeIcon
          name={type.icon}
          className="size-5"
          style={{ color: type.color }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{item.title}</h3>
          {item.isPinned && <PinMark color={type.color} />}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {item.description}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
      <time
        dateTime={item.createdAt.toISOString()}
        className="shrink-0 text-xs text-muted-foreground"
      >
        {format.dateTime(item.createdAt, "short")}
      </time>
    </article>
  );
}
