import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { I18nProvider } from "@/components/common/I18nProvider";
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
import { messagesFor } from "@/i18n/messages";

export const dynamic = "force-dynamic";

// The description of every page under this layout, in its language; the
// title stays the root layout's "DevStash".
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.meta");
  return { description: t("description") };
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [cookieStore, locale] = await Promise.all([cookies(), getLocale()]);
  // Not awaited: the shell does not wait for the read. The provider wraps the
  // shell because the top bar's dialogs hold editors too.
  const editorPreferences = getSessionUser().then(({ id }) =>
    getEditorPreferences(id),
  );

  // The outermost element: the editor preferences show their errors through
  // the messages too. Every message goes down, since the layout is dynamic and
  // its screens reach into many features (ADR 0024).
  return (
    <I18nProvider locale={locale} messages={messagesFor(locale)}>
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
    </I18nProvider>
  );
}
