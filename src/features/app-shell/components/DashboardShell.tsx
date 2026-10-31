"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { TopBar } from "@/features/app-shell/_internal/components/TopBar";
import { sidebarCookie } from "@/features/app-shell/domain/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  sidebar: ReactNode;
  /** The top bar's New Item button, filled by the layout with the user's plan. */
  newItemButton: ReactNode;
  /** From the sidebar cookie, so a reload keeps the sidebar as it was left. */
  defaultSidebarOpen: boolean;
  children: ReactNode;
}

export function DashboardShell({
  sidebar,
  newItemButton,
  defaultSidebarOpen,
  children,
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(defaultSidebarOpen);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const [drawerPathname, setDrawerPathname] = useState(pathname);

  // The mobile drawer closes when the page changes under it (a link, Back or
  // Forward), adjusted during render rather than in an effect.
  if (pathname !== drawerPathname) {
    setDrawerPathname(pathname);
    setIsDrawerOpen(false);
  }

  function toggleSidebar() {
    const next = !isSidebarOpen;
    setIsSidebarOpen(next);
    document.cookie = sidebarCookie(next);
  }

  // A link to the page already shown does not change the pathname, so a
  // click on any link closes the drawer too.
  function handleDrawerClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      setIsDrawerOpen(false);
    }
  }

  return (
    <div className="flex h-screen">
      <aside
        className={cn(
          "hidden w-64 shrink-0 border-r",
          isSidebarOpen && "md:block",
        )}
      >
        {sidebar}
      </aside>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="left"
          className="data-[side=left]:w-64 gap-0 p-0"
          showCloseButton={false}
          onClickCapture={handleDrawerClick}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Browse item types and collections
          </SheetDescription>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onToggleSidebar={toggleSidebar}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          newItemButton={newItemButton}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
