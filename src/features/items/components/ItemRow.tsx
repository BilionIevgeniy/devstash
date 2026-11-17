import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { useFormatter } from "next-intl";
import { AiGeneratedLabel } from "@/features/ai/components/AiGeneratedLabel";
import { aiMarkProps } from "@/features/ai/domain/marking";
import { ItemTagBadges } from "@/features/items/_internal/components/ItemTagBadges";
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
        <p
          className="truncate text-sm text-muted-foreground"
          {...aiMarkProps(item.descriptionAiGenerated)}
        >
          {item.descriptionAiGenerated && (
            <AiGeneratedLabel variant="icon" className="mr-1 inline" />
          )}
          {item.description}
        </p>
        <ItemTagBadges tags={item.tags} aiTags={item.aiTags} className="mt-2" />
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
