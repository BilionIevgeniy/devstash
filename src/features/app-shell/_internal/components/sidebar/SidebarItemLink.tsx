"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LINK_CLASS } from "@/features/app-shell/_internal/components/sidebar/shared";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import type { SidebarItem } from "@/features/items/types";
import { isItemPage, itemPagePath } from "@/features/search/domain/item-page";

interface SidebarItemLinkProps {
  item: SidebarItem;
}

// On the item's own full page the link goes nowhere: the same URL would open
// the intercepted drawer over the page, with no history entry to close it to.
export function SidebarItemLink({ item }: SidebarItemLinkProps) {
  const isCurrent = isItemPage(usePathname(), item);

  return (
    <Link
      href={itemPagePath(item)}
      aria-current={isCurrent ? "page" : undefined}
      onClick={isCurrent ? (event) => event.preventDefault() : undefined}
      className={LINK_CLASS}
    >
      <TypeIcon
        name={item.type.icon}
        className="size-4 shrink-0"
        style={{ color: item.type.color }}
      />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
