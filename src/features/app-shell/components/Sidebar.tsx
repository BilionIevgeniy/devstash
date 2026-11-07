import { Layers, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CollectionsSection } from "@/features/app-shell/_internal/components/sidebar/CollectionsSection";
import { ItemsSection } from "@/features/app-shell/_internal/components/sidebar/ItemsSection";
import { TypesSection } from "@/features/app-shell/_internal/components/sidebar/TypesSection";
import { UserArea } from "@/features/app-shell/_internal/components/sidebar/UserArea";
import { PlanBadge } from "@/features/billing/components/PlanBadge";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { getSidebarCollections } from "@/features/collections/queries";
import { getSidebarItemTypes } from "@/features/item-types/queries";
import { getSidebarItems } from "@/features/items/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

export async function Sidebar() {
  const user = await getSessionUser();
  const [itemTypes, collections, items, { isPro }] = await Promise.all([
    getSidebarItemTypes(user.id),
    getSidebarCollections(user.id),
    getSidebarItems(user.id),
    getEntitlements(user.id),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Layers className="size-6 text-primary" />
          <span className="text-lg font-semibold">DevStash</span>
        </Link>
        <PlanBadge isPro={isPro} />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-2">
        <TypesSection itemTypes={itemTypes} isPro={isPro} />
        <CollectionsSection {...collections} />
        <ItemsSection {...items} isPro={isPro} />
      </nav>

      {/* The same sidebar fills the drawer, which exists below `md`: there the
          top bar has only the icon, so this row carries the words. */}
      {!isPro && (
        <div className="shrink-0 px-2 pb-2 md:hidden">
          <Button
            asChild
            className="gradient-fill w-full text-background hover:opacity-90"
          >
            <Link href={UPGRADE_PATH}>
              <Sparkles />
              <span>Upgrade to Pro</span>
            </Link>
          </Button>
        </div>
      )}

      <UserArea user={user} />
    </div>
  );
}
