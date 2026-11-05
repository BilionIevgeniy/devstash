import type { ReactNode } from "react";
import Link from "next/link";
import { PanelLeft, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateCollectionDialog } from "@/features/collections/components/CreateCollectionDialog";
import { CommandPalette } from "@/features/search/components/CommandPalette";

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenDrawer: () => void;
  newItemButton: ReactNode;
}

export function TopBar({
  onToggleSidebar,
  onOpenDrawer,
  newItemButton,
}: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle sidebar"
        className="hidden md:inline-flex"
        onClick={onToggleSidebar}
      >
        <PanelLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open sidebar"
        className="md:hidden"
        onClick={onOpenDrawer}
      >
        <PanelLeft />
      </Button>
      <CommandPalette />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/favorites" aria-label="Favorites">
            <Star />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link href="/pinned" aria-label="Pinned">
            <Pin />
          </Link>
        </Button>
        <CreateCollectionDialog />
        {newItemButton}
      </div>
    </header>
  );
}
