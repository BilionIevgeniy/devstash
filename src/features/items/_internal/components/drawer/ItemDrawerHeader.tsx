import { Badge } from "@/components/ui/badge";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguageLabel } from "@/features/editor/components/hooks/use-language-label";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeLabel } from "@/features/item-types/domain/item-type";
import type { DashboardItem } from "@/features/items/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ItemDrawerHeaderProps {
  item: DashboardItem;
  language: string | null;
  /** "page" renders outside a Sheet, where SheetTitle cannot be used. */
  variant: "sheet" | "page";
}

export function ItemDrawerHeader({
  item,
  language,
  variant,
}: ItemDrawerHeaderProps) {
  const languageLabel = useLanguageLabel();
  const typeName = useTranslations("itemTypes");
  const { type } = item;
  const iconBackground = type.color
    ? `color-mix(in oklab, ${type.color} 10%, transparent)`
    : undefined;

  return (
    <SheetHeader
      className={cn(
        "flex-row items-start gap-3 p-6 pb-2",
        variant === "sheet" ? "pr-12" : "pr-6",
      )}
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBackground }}
      >
        <TypeIcon
          name={type.icon}
          className="size-6"
          style={{ color: type.color }}
        />
      </div>
      <div className="min-w-0 space-y-2">
        {variant === "sheet" ? (
          <SheetTitle className="text-lg wrap-anywhere">
            {item.title}
          </SheetTitle>
        ) : (
          <h1 className="font-heading text-lg font-medium wrap-anywhere text-foreground">
            {item.title}
          </h1>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {typeLabel(typeName, type.name, "one")}
          </Badge>
          {language?.trim() && (
            <Badge variant="outline">{languageLabel(language)}</Badge>
          )}
        </div>
      </div>
    </SheetHeader>
  );
}
