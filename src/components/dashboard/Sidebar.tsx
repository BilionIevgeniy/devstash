import Link from "next/link";
import {
  Code,
  File,
  Image,
  Layers,
  Link as LinkIcon,
  Settings,
  Sparkles,
  Star,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { CollapsibleSection } from "@/components/dashboard/CollapsibleSection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  mockCollections,
  mockItemTypeCounts,
  mockItemTypes,
  mockUser,
} from "@/lib/mock-data";

const TYPE_ICONS: Record<string, LucideIcon> = {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link: LinkIcon,
};

const RECENT_COLLECTIONS_LIMIT = 4;

const LINK_CLASS =
  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent";

const favoriteCollections = mockCollections.filter((c) => c.isFavorite);
const recentCollections = [...mockCollections]
  .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  .slice(0, RECENT_COLLECTIONS_LIMIT);

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

export function Sidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <Layers className="size-6 text-primary" />
        <span className="text-lg font-semibold">DevStash</span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        <CollapsibleSection title="Types">
          <ul>
            {mockItemTypes.map((type) => {
              const Icon = TYPE_ICONS[type.icon] ?? File;
              const count =
                mockItemTypeCounts[type.name as keyof typeof mockItemTypeCounts];
              return (
                <li key={type.id}>
                  <Link href={`/items/${type.name}s`} className={LINK_CLASS}>
                    <Icon className="size-4" style={{ color: type.color }} />
                    <span className="capitalize">{type.name}s</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="Collections">
          <GroupLabel>Favorites</GroupLabel>
          <ul>
            {favoriteCollections.map((collection) => (
              <li key={collection.id}>
                <Link
                  href={`/collections/${collection.id}`}
                  className={LINK_CLASS}
                >
                  <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
                  <span className="truncate">{collection.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {collection.itemCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <GroupLabel>Recent</GroupLabel>
          <ul>
            {recentCollections.map((collection) => (
              <li key={collection.id}>
                <Link
                  href={`/collections/${collection.id}`}
                  className={LINK_CLASS}
                >
                  <span className="truncate">{collection.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {collection.itemCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      </nav>

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
    </div>
  );
}
