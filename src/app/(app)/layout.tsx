import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";

import { ConsentRoot } from "@/components/common/consent/ConsentRoot";
import { AppToaster } from "@/components/common/providers/AppToaster";
import { I18nProvider } from "@/components/common/providers/I18nProvider";
import { QueryProvider } from "@/components/common/providers/QueryProvider";
import { DashboardShell } from "@/features/app-shell/components/DashboardShell";
import { Sidebar } from "@/features/app-shell/components/Sidebar";
import {
  parseSidebarOpen,
  SIDEBAR_COOKIE,
} from "@/features/app-shell/domain/sidebar";
import { NewItemButton } from "@/app/(app)/_components/NewItemButton";
import { NewItemButtonFallback } from "@/app/(app)/_components/NewItemButtonFallback";
import { UpgradeButton } from "@/app/(app)/_components/UpgradeButton";
import { SidebarSkeleton } from "@/features/app-shell/components/SidebarSkeleton";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { EditorPreferencesProvider } from "@/features/editor/components/EditorPreferencesProvider";
import { getEditorPreferences } from "@/features/editor/queries";
import { appMessages } from "@/i18n/messages";
import { TITLE_TEMPLATE } from "@/app/page-title";

// The layout reads the request at its top (the locale, the sidebar cookie)
// and every page below reads the session, so this segment blocks on the
// server and has no static shell (ADR 0037). A text-free fallback would have
// to guess the sidebar's width and would shift the page when the shell came.
export const instant = false;

// Never indexed: the same rule goes out as the X-Robots-Tag header
// (next.config.ts). Static, with the root layout's title and description: a
// description read in the visitor's language read the request, and every
// navigation inside the app (an item's drawer) waited for it (instant
// validation, e2e/instant.spec.ts). Pages that are never indexed need no
// words of their own here.
export const metadata: Metadata = {
  title: TITLE_TEMPLATE,
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [cookieStore, locale] = await Promise.all([cookies(), getLocale()]);
  // Not awaited: the shell does not wait for the read. The provider wraps the
  // shell because the top bar's dialogs hold editors too.
  const editorPreferences = getSessionUser().then(({ id }) =>
    getEditorPreferences(id),
  );

  // The outermost element: the editor preferences show their errors through
  // the messages too. Every namespace the app's screens read goes down, since
  // the layout is dynamic and they reach into many features (ADR 0024).
  return (
    <I18nProvider locale={locale} messages={appMessages(locale)}>
      {/* Around the shell: the top bar's create dialogs read the collection
          options through it too (ADR 0025). */}
      <QueryProvider>
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
      </QueryProvider>
      <AppToaster />
      <ConsentRoot />
    </I18nProvider>
  );
}
