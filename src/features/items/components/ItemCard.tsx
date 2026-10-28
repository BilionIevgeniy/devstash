import { Pin, Star } from "lucide-react";

import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { formatShortDate } from "@/lib/utils";
import type { DashboardItem } from "@/features/items/types";

interface ItemCardProps {
  item: DashboardItem;
}

export function ItemCard({ item }: ItemCardProps) {
  const { type } = item;
  const iconBackground = type.color
    ? `color-mix(in oklab, ${type.color} 10%, transparent)`
    : undefined;

  return (
    <article
      className="flex flex-col gap-3 rounded-lg border border-l-4 bg-card p-4"
      style={{ borderLeftColor: type.color }}
    >
      <div className="flex items-start gap-3">
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
            <h2 className="truncate font-medium">{item.title}</h2>
            {item.isPinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </div>
          {item.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        <ul className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
        <time
          dateTime={item.createdAt.toISOString()}
          className="ml-auto shrink-0 text-xs text-muted-foreground"
        >
          {formatShortDate(item.createdAt)}
        </time>
      </div>
    </article>
  );
}
