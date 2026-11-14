import Link from "next/link";
import type { ReactNode } from "react";

import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { DeleteLockedItemButton } from "@/features/items/_internal/components/DeleteLockedItemButton";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { useTranslations } from "next-intl";
import type { DashboardItem } from "@/features/items/types";

interface LockedItemCardProps {
  item: DashboardItem;
  children: ReactNode;
}

// Only the card fades: the text and the delete button stay readable. They are
// siblings of the link, since a control inside a link is not allowed.
export function LockedItemCard({ item, children }: LockedItemCardProps) {
  const t = useTranslations("items.locked");
  const { focusListTop } = useItemDrawer();

  return (
    <div className="relative h-full">
      <div className="h-full opacity-40" aria-hidden="true">
        {children}
      </div>
      <Link
        href={UPGRADE_PATH}
        aria-label={t("named", { title: item.title })}
        className="absolute inset-0 flex items-center justify-center rounded-lg px-10 text-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("label")}
      </Link>
      <div className="absolute top-2 right-2">
        <DeleteLockedItemButton
          itemId={item.id}
          title={item.title}
          returnFocus={focusListTop}
          className="size-8"
        />
      </div>
    </div>
  );
}
