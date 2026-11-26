import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix refuses "" as a value, and a tag can be any text, so every tag is
// prefixed and "all" can never be one of them.
const ALL_TAGS = "all";
const TAG_PREFIX = "tag:";

interface TagFilterProps {
  tags: string[];
  value: string | null;
  onChange: (tag: string | null) => void;
}

// On a phone it takes the rest of the line beside the sort, so the filters stay
// one row whether or not there are tags.
// The current tag is offered even when no item has it any more (a shared link,
// a tag just removed), so the select always shows what the URL says.
export function TagFilter({ tags, value, onChange }: TagFilterProps) {
  const t = useTranslations("pages.items");
  const options =
    value === null || tags.includes(value) ? tags : [value, ...tags];

  return (
    <Select
      value={value === null ? ALL_TAGS : `${TAG_PREFIX}${value}`}
      onValueChange={(next) =>
        onChange(next === ALL_TAGS ? null : next.slice(TAG_PREFIX.length))
      }
    >
      <SelectTrigger
        aria-label={t("filterByTag")}
        className="w-44 max-w-full max-md:min-w-32 max-md:flex-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_TAGS}>{t("allTags")}</SelectItem>
        {options.map((tag) => (
          <SelectItem key={tag} value={`${TAG_PREFIX}${tag}`}>
            {tag}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
