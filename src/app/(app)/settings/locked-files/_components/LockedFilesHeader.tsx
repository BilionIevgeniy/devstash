import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SETTINGS_PATH } from "@/features/auth/domain/auth-paths";

interface LockedFilesHeaderProps {
  /** The link to renew, or its placeholder while the plan is not known. */
  renew: ReactNode;
}

// Shared with loading.tsx: the title, the lead and the way back need no data.
export function LockedFilesHeader({ renew }: LockedFilesHeaderProps) {
  const t = useTranslations("pages.lockedFiles");
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline">
          <Link href={SETTINGS_PATH}>{t("back")}</Link>
        </Button>
        {renew}
      </div>
    </header>
  );
}
