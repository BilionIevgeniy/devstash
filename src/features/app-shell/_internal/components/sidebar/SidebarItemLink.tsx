"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LINK_CLASS } from "@/features/app-shell/_internal/components/sidebar/shared";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import type { SidebarItem } from "@/features/items/types";
import { isItemPage, itemPagePath } from "@/features/search/domain/item-page";
import { cn } from "@/lib/utils";

interface SidebarItemLinkProps {
  item: SidebarItem;
  /** The plan does not give this type: the link leads to the upgrade page. */
  isLocked: boolean;
}

// On the item's own full page the link goes nowhere: the same URL would open
// the intercepted drawer over the page, with no history entry to close it to.
export function SidebarItemLink({ item, isLocked }: SidebarItemLinkProps) {
  const t = useTranslations("shell");
  const isCurrent = isItemPage(usePathname(), item);

  const content = (
    <>
      <TypeIcon
        name={item.type.icon}
        className="size-4 shrink-0"
        style={{ color: item.type.color }}
      />
      <span className="truncate">{item.title}</span>
    </>
  );

  if (isLocked) {
    return (
      <Link
        href={UPGRADE_PATH}
        aria-label={t("locked", { title: item.title })}
        className={cn(LINK_CLASS, "opacity-50")}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      href={itemPagePath(item)}
      aria-current={isCurrent ? "page" : undefined}
      onClick={isCurrent ? (event) => event.preventDefault() : undefined}
      className={LINK_CLASS}
    >
      {content}
    </Link>
  );
}
