import type { Prisma } from "@/generated/prisma/client";
import { DEMO_USER_FILTER } from "@/lib/db/demo-user";
import { prisma } from "@/lib/prisma";
import type { ItemTypeInfo, SidebarItemType } from "@/types/items";

const DEFAULT_TYPE_ICON = "File";
const SYSTEM_TYPE_ORDER = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "link",
];

export const itemTypeSelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
} satisfies Prisma.ItemTypeSelect;

type RawItemType = Prisma.ItemTypeGetPayload<{
  select: typeof itemTypeSelect;
}>;

export function toItemTypeInfo(type: RawItemType): ItemTypeInfo {
  return {
    id: type.id,
    name: type.name,
    icon: type.icon ?? DEFAULT_TYPE_ICON,
    color: type.color ?? undefined,
  };
}

function systemTypePosition(name: string): number {
  const index = SYSTEM_TYPE_ORDER.indexOf(name);
  return index === -1 ? SYSTEM_TYPE_ORDER.length : index;
}

export async function getSidebarItemTypes(): Promise<SidebarItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: {
      ...itemTypeSelect,
      _count: { select: { items: { where: DEMO_USER_FILTER } } },
    },
  });

  return types
    .map(({ _count, ...type }) => ({
      ...toItemTypeInfo(type),
      itemCount: _count.items,
    }))
    .sort((a, b) => systemTypePosition(a.name) - systemTypePosition(b.name));
}
