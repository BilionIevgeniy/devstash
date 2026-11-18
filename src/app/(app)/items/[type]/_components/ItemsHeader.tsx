import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { typeLabel } from "@/features/item-types/domain/item-type";
import { useTranslations } from "next-intl";
import type { ItemTypeInfo } from "@/features/item-types/types";
import { CreateItemDialog } from "@/features/items/components/CreateItemDialog";

interface ItemsHeaderProps {
  type: ItemTypeInfo;
  totalCount: number;
  isPro: boolean;
  /** The user's custom types, for the create dialog. */
  customTypeNames: readonly string[];
}

// Outside the list's Suspense, so it stays put while the rows change.
export function ItemsHeader({
  type,
  totalCount,
  isPro,
  customTypeNames,
}: ItemsHeaderProps) {
  const typeName = useTranslations("itemTypes");
  const t = useTranslations("common");

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <TypeIcon
            name={type.icon}
            className="size-7"
            style={{ color: type.color }}
          />
          {typeLabel(typeName, type.name, "other")}
        </h1>
        <p className="text-muted-foreground">
          {t("itemCount", { count: totalCount })}
        </p>
      </div>
      <CreateItemDialog
        defaultType={type.name}
        customTypeNames={customTypeNames}
        isPro={isPro}
      />
    </header>
  );
}
