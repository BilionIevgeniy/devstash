import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomTypeDialog } from "@/features/item-types/_internal/components/CustomTypeDialog";
import { DeleteCustomTypeDialog } from "@/features/item-types/_internal/components/DeleteCustomTypeDialog";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import type { CustomTypeRow } from "@/features/item-types/types";

interface CustomTypeListRowProps {
  type: CustomTypeRow;
  /** Edit is Pro only; delete stays open to a former Pro user. */
  canEdit: boolean;
  sync?: () => Promise<void>;
}

export function CustomTypeListRow({
  type,
  canEdit,
  sync,
}: CustomTypeListRowProps) {
  const t = useTranslations();
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <TypeIcon
        name={type.icon}
        aria-hidden
        className="size-4 shrink-0"
        style={{ color: type.color }}
      />
      <Link
        href={`/items/${type.slug}`}
        className="min-w-0 flex-1 truncate font-medium hover:underline"
      >
        {type.name}
      </Link>
      <span className="text-sm text-muted-foreground">
        {t("common.itemCount", { count: type.itemCount })}
      </span>
      {canEdit && (
        <CustomTypeDialog
          type={type}
          sync={sync}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("customTypes.editLabel", { name: type.name })}
            >
              <Pencil className="size-4" />
            </Button>
          }
        />
      )}
      <DeleteCustomTypeDialog type={type} sync={sync} />
    </li>
  );
}
