import { Layers } from "lucide-react";

import { CollectionsSection } from "@/features/app-shell/_internal/components/sidebar/CollectionsSection";
import { TypesSection } from "@/features/app-shell/_internal/components/sidebar/TypesSection";
import { UserArea } from "@/features/app-shell/_internal/components/sidebar/UserArea";
import { getSidebarCollections } from "@/features/collections/queries";
import { getSidebarItemTypes } from "@/features/item-types/queries";
import { getSessionUser } from "@/features/auth/services/session";

export async function Sidebar() {
  const user = await getSessionUser();
  const [itemTypes, collections] = await Promise.all([
    getSidebarItemTypes(user.id),
    getSidebarCollections(user.id),
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

      <UserArea user={user} />
    </div>
  );
}
