import { Suspense } from "react";

import { DashboardShell } from "@/features/app-shell/components/DashboardShell";
import { Sidebar } from "@/features/app-shell/components/Sidebar";
import {
  NewItemButton,
  NewItemButtonFallback,
} from "@/app/(app)/_components/NewItemButton";
import { SidebarSkeleton } from "@/features/app-shell/components/SidebarSkeleton";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <DashboardShell
      sidebar={
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      }
      newItemButton={
        <Suspense fallback={<NewItemButtonFallback />}>
          <NewItemButton />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}
