import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PanelLeft, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateCollectionDialog } from "@/features/collections/components/CreateCollectionDialog";
import { CommandPalette } from "@/features/search/components/CommandPalette";

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenDrawer: () => void;
  upgradeButton: ReactNode;
  newItemButton: ReactNode;
}

export function TopBar({
  onToggleSidebar,
  onOpenDrawer,
  upgradeButton,
  newItemButton,
}: TopBarProps) {
  const t = useTranslations("shell");
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("toggleSidebar")}
        className="hidden md:inline-flex"
        onClick={onToggleSidebar}
      >
        <PanelLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("openSidebar")}
        className="md:hidden"
        onClick={onOpenDrawer}
      >
        <PanelLeft />
      </Button>
      <CommandPalette />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* First in the group: it streams in, and the group is held to the
            right, so the buttons after it do not move when it arrives. */}
        {upgradeButton}
        <Button asChild variant="ghost" size="icon">
          <Link href="/favorites" aria-label={t("favorites")}>
            <Star />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link href="/pinned" aria-label={t("pinned")}>
            <Pin />
          </Link>
        </Button>
        <div className="hidden sm:flex">
          <CreateCollectionDialog />
        </div>
        {newItemButton}
      </div>
    </header>
  );
}
