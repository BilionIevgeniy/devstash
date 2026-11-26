import { Pencil, Pin, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/common/CopyButton";
import { Button } from "@/components/ui/button";
import { ACTION_LABEL } from "@/features/items/_internal/components/drawer/action-label";
import {
  DeleteItemDialog,
  type ItemDeleteHandler,
} from "@/features/items/_internal/components/delete/DeleteItemDialog";
import {
  useItemFavorite,
  useItemPin,
} from "@/features/items/components/hooks/use-item-drawer";
import type { DashboardItem } from "@/features/items/types";
import { typeInk } from "@/features/item-types/components/type-color";
import { cn } from "@/lib/utils";

interface ItemActionBarProps {
  item: DashboardItem;
  canEdit: boolean;
  /** Null while the detail loads and for an upload, which has nothing to copy. */
  copyValue: string | null;
  onEdit: () => void;
  onDelete: ItemDeleteHandler;
}

export function ItemActionBar({
  item,
  canEdit,
  copyValue,
  onEdit,
  onDelete,
}: ItemActionBarProps) {
  const t = useTranslations();
  const { id: itemId, title } = item;
  const favorite = useItemFavorite(itemId, item.isFavorite);
  const pin = useItemPin(itemId, item.isPinned);
  const pinInk = pin.isPinned ? typeInk(item.type.color) : undefined;

  return (
    <div className="flex items-center gap-1 border-b px-6 py-3">
      <Button
        type="button"
        variant="ghost"
        aria-pressed={favorite.isFavorite}
        aria-disabled={favorite.isPending}
        onClick={favorite.toggle}
        className={cn(
          "max-md:min-w-11 aria-disabled:opacity-50",
          favorite.isFavorite && "text-favorite hover:text-favorite",
        )}
      >
        <Star className={cn(favorite.isFavorite && "fill-favorite")} />
        <span className={ACTION_LABEL}>{t("items.actions.favorite")}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-pressed={pin.isPinned}
        aria-disabled={pin.isPending}
        onClick={pin.toggle}
        className={cn(
          "max-md:min-w-11 aria-disabled:opacity-50",
          pinInk && `${pinInk.className} hover:text-type`,
        )}
        style={pinInk?.style}
      >
        <Pin className={cn(pin.isPinned && "fill-current")} />
        <span className={ACTION_LABEL}>{t("items.actions.pin")}</span>
      </Button>
      {copyValue !== null && (
        <CopyButton
          value={copyValue}
          label={t("items.actions.copyNamed", { title })}
          className="max-md:min-w-11"
        >
          <span className={ACTION_LABEL}>{t("common.actions.copy")}</span>
        </CopyButton>
      )}
      <Button
        type="button"
        variant="ghost"
        className="ml-auto max-md:min-w-11"
        disabled={!canEdit}
        onClick={onEdit}
      >
        <Pencil />
        <span className={ACTION_LABEL}>{t("common.actions.edit")}</span>
      </Button>
      {/* Apart from Edit on a phone, so a tap cannot hit the destructive one. */}
      <div className="flex max-md:ml-3">
        <DeleteItemDialog
          itemId={itemId}
          title={title}
          disabled={!canEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
