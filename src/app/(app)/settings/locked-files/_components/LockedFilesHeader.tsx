"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface LockedFilesHeaderProps {
  /** The links, or their placeholders while the plan is not known. */
  actions: ReactNode;
}

// Shared with loading.tsx: the title and the lead need no data.
export function LockedFilesHeader({ actions }: LockedFilesHeaderProps) {
  const t = useTranslations("pages.lockedFiles");
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
