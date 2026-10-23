import { Suspense } from "react";

import { DashboardShell } from "@/features/app-shell/components/DashboardShell";
import { Sidebar } from "@/features/app-shell/components/Sidebar";
import { SidebarSkeleton } from "@/features/app-shell/components/SidebarSkeleton";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <DashboardShell
      sidebar={
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}
