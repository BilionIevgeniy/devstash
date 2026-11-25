import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeTint } from "@/features/item-types/components/type-color";
import { useFormatter } from "next-intl";
import { AiGeneratedLabel } from "@/features/ai/components/AiGeneratedLabel";
import { aiMarkProps } from "@/features/ai/domain/marking";
import { ItemTagBadges } from "@/features/items/_internal/components/cards/ItemTagBadges";
import { PinMark } from "@/features/items/_internal/components/toggles/PinMark";
import { cn } from "@/lib/utils";
import type { ItemCardData } from "@/features/items/types";

interface ItemRowProps {
  item: ItemCardData;
}

export function ItemRow({ item }: ItemRowProps) {
  const format = useFormatter();
  const { type } = item;
  const dateTime = item.createdAt.toISOString();
  const date = format.dateTime(item.createdAt, "short");

  // The padding leaves room for the buttons over the corner (ItemCardTrigger).
  return (
    <article
      className={cn(
        "flex items-start gap-4 rounded-lg border border-l-4 bg-card p-4 transition-colors group-hover/card:bg-accent/50",
        item.canCopy ? "pr-22 max-md:pr-26" : "pr-14 max-md:pr-15",
      )}
      style={{ borderLeftColor: type.color }}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: typeTint(type.color) }}
      >
        <TypeIcon name={type.icon} className="size-5" typeColor={type.color} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="line-clamp-2 font-medium wrap-anywhere sm:truncate">
            {item.title}
          </h3>
          {item.isPinned && <PinMark color={type.color} />}
        </div>
        {/* Below sm the date leaves its column for this line, so the title
            gets the width back. */}
        <div className="flex gap-2 text-sm text-muted-foreground">
          <time dateTime={dateTime} className="shrink-0 sm:hidden">
            {date}
          </time>
          <p
            className="min-w-0 truncate"
            {...aiMarkProps(item.descriptionAiGenerated)}
          >
            {item.descriptionAiGenerated && (
              <AiGeneratedLabel variant="icon" className="mr-1 inline" />
            )}
            {item.description}
          </p>
        </div>
        <ItemTagBadges tags={item.tags} aiTags={item.aiTags} className="mt-2" />
      </div>
      <time
        dateTime={dateTime}
        className="hidden shrink-0 text-xs text-muted-foreground sm:block"
      >
        {date}
      </time>
    </article>
  );
}
