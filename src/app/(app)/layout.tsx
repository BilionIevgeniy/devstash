import { Suspense } from "react";
import { cookies } from "next/headers";

import { DashboardShell } from "@/features/app-shell/components/DashboardShell";
import { Sidebar } from "@/features/app-shell/components/Sidebar";
import {
  parseSidebarOpen,
  SIDEBAR_COOKIE,
} from "@/features/app-shell/domain/sidebar";
import {
  NewItemButton,
  NewItemButtonFallback,
} from "@/app/(app)/_components/NewItemButton";
import { SidebarSkeleton } from "@/features/app-shell/components/SidebarSkeleton";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();

  return (
    <DashboardShell
      defaultSidebarOpen={parseSidebarOpen(
        cookieStore.get(SIDEBAR_COOKIE)?.value,
      )}
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
