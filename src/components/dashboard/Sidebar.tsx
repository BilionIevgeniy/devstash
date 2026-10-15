import { Layers } from "lucide-react";

import { CollectionsSection } from "@/components/dashboard/sidebar/CollectionsSection";
import { TypesSection } from "@/components/dashboard/sidebar/TypesSection";
import { UserArea } from "@/components/dashboard/sidebar/UserArea";
import { getSidebarCollections } from "@/lib/db/collections";
import { getSidebarItemTypes } from "@/lib/db/item-types";

export async function Sidebar() {
  const [itemTypes, collections] = await Promise.all([
    getSidebarItemTypes(),
    getSidebarCollections(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <Layers className="size-6 text-primary" />
        <span className="text-lg font-semibold">DevStash</span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        <TypesSection itemTypes={itemTypes} />
        <CollectionsSection {...collections} />
      </nav>

      <UserArea />
    </div>
  );
}
