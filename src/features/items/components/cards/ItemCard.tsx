import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { useFormatter } from "next-intl";
import { AiGeneratedLabel } from "@/features/ai/components/AiGeneratedLabel";
import { aiMarkProps } from "@/features/ai/domain/marking";
import { ItemTagBadges } from "@/features/items/_internal/components/cards/ItemTagBadges";
import { PinMark } from "@/features/items/_internal/components/toggles/PinMark";
import { cn } from "@/lib/utils";
import type { ItemCardData } from "@/features/items/types";

interface ItemCardProps {
  item: ItemCardData;
}

export function ItemCard({ item }: ItemCardProps) {
  const format = useFormatter();
  const { type } = item;
  const iconBackground = type.color
    ? `color-mix(in oklab, ${type.color} 10%, transparent)`
    : undefined;

  return (
    <article
      className="flex h-full flex-col gap-3 rounded-lg border border-l-4 bg-card p-4 transition-colors group-hover/card:bg-accent/50"
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
        {/* Room for the buttons over the corner (ItemCardTrigger). */}
        <div
          className={cn(
            "min-w-0 flex-1",
            item.canCopy ? "pr-16 max-md:pr-20" : "pr-8 max-md:pr-10",
          )}
        >
          <div className="flex items-center gap-2">
            <h2 className="truncate font-medium">{item.title}</h2>
            {item.isPinned && <PinMark color={type.color} />}
          </div>
          {item.description && (
            <p
              className="line-clamp-2 text-sm text-muted-foreground"
              {...aiMarkProps(item.descriptionAiGenerated)}
            >
              {item.descriptionAiGenerated && (
                <AiGeneratedLabel variant="icon" className="mr-1 inline" />
              )}
              {item.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        <ItemTagBadges tags={item.tags} aiTags={item.aiTags} />
        <time
          dateTime={item.createdAt.toISOString()}
          className="ml-auto shrink-0 text-xs text-muted-foreground"
        >
          {format.dateTime(item.createdAt, "short")}
        </time>
      </div>
    </article>
  );
}
