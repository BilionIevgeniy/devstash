import { Database } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { ExportButton } from "@/features/import-export/_internal/components/ExportButton";
import { ImportButton } from "@/features/import-export/_internal/components/ImportButton";

interface DataSectionProps {
  isPro: boolean;
}

// Export and import of the settings page. The plan comes from the page's
// panel; the route and the actions check it again.
export function DataSection({ isPro }: DataSectionProps) {
  const t = useTranslations("importExport");
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Database className="size-4 text-muted-foreground" />
        {t("title")}
      </h2>
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {isPro ? (
          <div className="flex flex-wrap items-start gap-3">
            <ExportButton />
            <ImportButton />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">{t("proOnly")}</p>
            <Button asChild variant="outline">
              <Link href={UPGRADE_PATH}>{t("upgrade")}</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
