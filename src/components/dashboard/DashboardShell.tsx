"use client";

import { useState, type ReactNode } from "react";

import { TopBar } from "@/components/dashboard/TopBar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

interface DashboardShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function DashboardShell({ sidebar, children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {isSidebarOpen && (
        <aside className="hidden w-64 shrink-0 border-r md:block">
          {sidebar}
        </aside>
      )}

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="left"
          className="w-64 gap-0 p-0"
          showCloseButton={false}
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
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
