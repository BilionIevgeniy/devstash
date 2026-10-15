import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarSkeleton } from "@/components/dashboard/SidebarSkeleton";

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
