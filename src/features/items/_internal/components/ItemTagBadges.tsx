import { AiGeneratedLabel } from "@/features/ai/components/AiGeneratedLabel";
import { aiMarkProps } from "@/features/ai/domain/marking";
import { cn } from "@/lib/utils";

interface ItemTagBadgesProps {
  tags: string[];
  /** The tags that are accepted AI suggestions (ADR 0027). */
  aiTags: string[];
  /** In the drawer, outside a button: each AI tag is announced as such. */
  spoken?: boolean;
  className?: string;
}

// The tags of a card, a row or the drawer. An AI tag carries the attribute and
// an icon; on a card the icon is decorative, since the card is one big button
// and a spoken label per tag would bury its name.
export function ItemTagBadges({
  tags,
  aiTags,
  spoken = false,
  className,
}: ItemTagBadgesProps) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => {
        const marked = aiTags.includes(tag);
        return (
          <li
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            {...aiMarkProps(marked)}
          >
            {marked && <AiGeneratedLabel variant="icon" spoken={spoken} />}
            {tag}
          </li>
        );
      })}
    </ul>
  );
}
