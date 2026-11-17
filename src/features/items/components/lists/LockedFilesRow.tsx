import Link from "next/link";
import { useTranslations } from "next-intl";

import { LOCKED_FILES_PATH } from "@/features/items/domain/item-fields";

interface LockedFilesRowProps {
  count: number;
}

export function LockedFilesRow({ count }: LockedFilesRowProps) {
  const t = useTranslations("items.locked");
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t pt-4 text-sm">
      <span className="text-muted-foreground">{t("count", { count })}</span>
      <Link
        href={LOCKED_FILES_PATH}
        className="font-medium underline-offset-4 hover:underline"
      >
        {t("manage")}
      </Link>
    </div>
  );
}
