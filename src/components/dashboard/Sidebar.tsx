import Link from "next/link";
import { Layers, Settings, Star } from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/CollapsibleSection";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getRecentCollections } from "@/lib/db/collections";
import { getSidebarItemTypes } from "@/lib/db/items";
import { mockUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { DashboardCollection } from "@/types/collections";
import type { SidebarItemType } from "@/types/items";

const RECENT_COLLECTIONS_LIMIT = 4;
const PRO_TYPE_NAMES = ["file", "image"];

const LINK_CLASS =
  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function GroupLabel({ children }: { children: string }) {
  return (
    <h3 className="px-2 pb-1 pt-2 text-xs font-medium uppercase text-muted-foreground">
      {children}
    </h3>
  );
}

function ItemCount({ value }: { value: number }) {
  return <span className="ml-auto text-xs text-muted-foreground">{value}</span>;
}

function ProBadge() {
  return (
    <Badge
      variant="outline"
      className="h-4 px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"
    >
      PRO
    </Badge>
  );
}

function TypesSection({ itemTypes }: { itemTypes: SidebarItemType[] }) {
  return (
    <CollapsibleSection title="Types">
      <ul>
        {itemTypes.map((type) => (
          <li key={type.id}>
            <Link href={`/items/${type.name}s`} className={LINK_CLASS}>
              <TypeIcon
                name={type.icon}
                className="size-4"
                style={{ color: type.color }}
              />
              <span className="capitalize">{type.name}s</span>
              {PRO_TYPE_NAMES.includes(type.name) && <ProBadge />}
              <ItemCount value={type.itemCount} />
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}

function CollectionsSection({
  collections,
}: {
  collections: DashboardCollection[];
}) {
  const favorites = collections.filter((c) => c.isFavorite);
  const recent = collections.slice(0, RECENT_COLLECTIONS_LIMIT);

  return (
    <CollapsibleSection title="Collections">
      <GroupLabel>Favorites</GroupLabel>
      <ul>
        {favorites.map((collection) => (
          <li key={collection.id}>
            <Link href={`/collections/${collection.id}`} className={LINK_CLASS}>
              <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
              <span className="truncate">{collection.name}</span>
              <ItemCount value={collection.itemCount} />
            </Link>
          </li>
        ))}
      </ul>
      <GroupLabel>Recent</GroupLabel>
      <ul>
        {recent.map((collection) => {
          const color = collection.types[0]?.color;
          return (
            <li key={collection.id}>
              <Link
                href={`/collections/${collection.id}`}
                className={LINK_CLASS}
              >
                <span
                  aria-hidden
                  className="flex size-4 shrink-0 items-center justify-center"
                >
                  <span
                    className="size-2.5 rounded-full bg-muted-foreground/40"
                    style={color ? { backgroundColor: color } : undefined}
                  />
                </span>
                <span className="truncate">{collection.name}</span>
                <ItemCount value={collection.itemCount} />
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/collections"
        className={cn(LINK_CLASS, "mt-1 text-muted-foreground")}
      >
        View all collections
      </Link>
    </CollapsibleSection>
  );
}

function UserArea() {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t p-4">
      <Avatar>
        <AvatarFallback>{getInitials(mockUser.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{mockUser.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {mockUser.email}
        </p>
      </div>
      <Settings className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

export async function Sidebar() {
  const [itemTypes, collections] = await Promise.all([
    getSidebarItemTypes(),
    getRecentCollections(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <Layers className="size-6 text-primary" />
        <span className="text-lg font-semibold">DevStash</span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        <TypesSection itemTypes={itemTypes} />
        <CollectionsSection collections={collections} />
      </nav>

      <UserArea />
    </div>
  );
}
