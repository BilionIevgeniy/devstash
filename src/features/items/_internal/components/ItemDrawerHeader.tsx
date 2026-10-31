import { Badge } from "@/components/ui/badge";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeSlug } from "@/features/item-types/domain/item-type";
import type { DashboardItem } from "@/features/items/types";
import { cn } from "@/lib/utils";

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
          <SheetTitle className="text-lg">{item.title}</SheetTitle>
        ) : (
          <h1 className="font-heading text-lg font-medium text-foreground">
            {item.title}
          </h1>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="capitalize">
            {typeSlug(type.name)}
          </Badge>
          {language && <Badge variant="outline">{language}</Badge>}
        </div>
      </div>
    </SheetHeader>
  );
}
