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
import { UpgradeButton } from "@/app/(app)/_components/UpgradeButton";
import { SidebarSkeleton } from "@/features/app-shell/components/SidebarSkeleton";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { EditorPreferencesProvider } from "@/features/editor/components/EditorPreferencesProvider";
import { getEditorPreferences } from "@/features/editor/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  // Not awaited: the shell does not wait for the read. The provider wraps the
  // shell because the top bar's dialogs hold editors too.
  const editorPreferences = getSessionUser().then(({ id }) =>
    getEditorPreferences(id),
  );

  return (
    <EditorPreferencesProvider preferences={editorPreferences}>
      <DashboardShell
        defaultSidebarOpen={parseSidebarOpen(
          cookieStore.get(SIDEBAR_COOKIE)?.value,
        )}
        sidebar={
          <Suspense fallback={<SidebarSkeleton />}>
            <Sidebar />
          </Suspense>
        }
        upgradeButton={
          <Suspense>
            <UpgradeButton />
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
    </EditorPreferencesProvider>
  );
}
