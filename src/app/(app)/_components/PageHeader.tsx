"use client";

import { useTranslations } from "next-intl";

/** The pages whose title and lead need no data. */
export type PageHeaderNamespace =
  | "pages.dashboard"
  | "pages.favorites"
  | "pages.pinned"
  | "pages.profile"
  | "pages.settings";

interface PageHeaderProps {
  namespace: PageHeaderNamespace;
}

// The header of a page and of its loading.tsx. A client component: its words
// come from the layout's provider, so a loading state reads no request and
// stays instant (`instant` validation of next dev, e2e/instant.spec.ts).
export function PageHeader({ namespace }: PageHeaderProps) {
  const t = useTranslations(namespace);
  return (
    <header>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("lead")}</p>
    </header>
  );
}
