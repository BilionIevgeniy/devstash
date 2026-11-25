"use client";

import { useLocale } from "next-intl";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { MAIN_CONTENT_ID } from "@/components/common/main-content";
import { SkipLink } from "@/components/common/SkipLink";
import { MobileDrawer } from "@/features/app-shell/_internal/components/MobileDrawer";
import { TopBar } from "@/features/app-shell/_internal/components/TopBar";
import { sidebarCookie } from "@/features/app-shell/domain/sidebar";
import { cn } from "@/lib/utils";
import { AppFooter } from "@/features/app-shell/_internal/components/AppFooter";
import { markAppShellShown } from "@/features/auth/components/app-shell-document";
import { useReloadOnRestore } from "@/features/auth/components/hooks/use-reload-on-restore";

interface DashboardShellProps {
  sidebar: ReactNode;
  /** The top bar's Upgrade button, filled by the layout with the user's plan. */
  upgradeButton: ReactNode;
  /**
   * The top bar's New Item button, or the create menu on a phone, filled by the
   * layout with the user's plan.
   */
  newItemButton: ReactNode;
  /** From the sidebar cookie, so a reload keeps the sidebar as it was left. */
  defaultSidebarOpen: boolean;
  children: ReactNode;
}

export function DashboardShell({
  sidebar,
  upgradeButton,
  newItemButton,
  defaultSidebarOpen,
  children,
}: DashboardShellProps) {
  // Back to an app page from the browser's back-forward cache after a
  // sign-out must not show the ended session's data.
  useReloadOnRestore();
  // An auth page later in this document loads as a new one (FreshAuthDocument).
  useEffect(() => markAppShellShown(), []);
  const locale = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(defaultSidebarOpen);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerButtonRef = useRef<HTMLButtonElement>(null);
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

  return (
    <div lang={locale} className="flex h-screen">
      <SkipLink />
      <aside
        className={cn(
          "hidden w-64 shrink-0 border-r",
          isSidebarOpen && "md:block",
        )}
      >
        {sidebar}
      </aside>

      <MobileDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        returnFocusRef={drawerButtonRef}
      >
        {sidebar}
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onToggleSidebar={toggleSidebar}
          drawerButtonRef={drawerButtonRef}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          upgradeButton={upgradeButton}
          newItemButton={newItemButton}
        />
        <main
          id={MAIN_CONTENT_ID}
          className="flex flex-1 flex-col outline-none scroll-pb-(--consent-inset) overflow-y-auto p-6 pb-[calc(--spacing(6)+var(--consent-inset,0px))]"
        >
          {/* At least as tall as the screen, so the footer does not jump when a
              skeleton gives way to a shorter or longer page. */}
          <div className="flex-[1_0_auto]">{children}</div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
