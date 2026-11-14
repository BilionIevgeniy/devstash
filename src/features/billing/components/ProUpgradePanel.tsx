import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { TestModeHint } from "@/features/billing/components/TestModeHint";
import { UpgradePlans } from "@/features/billing/_internal/components/UpgradePlans";

interface ProUpgradePanelProps {
  /** Stripe runs on a test key, so no payment is real. */
  testMode: boolean;
  /** A row below the plans, filled by the page: billing knows no items. */
  children?: ReactNode;
}

export function ProUpgradePanel({ testMode, children }: ProUpgradePanelProps) {
  const t = useTranslations("billing.upgradePage");
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <UpgradePlans />
      <div className="mx-auto max-w-xl space-y-4">
        {testMode && <TestModeHint className="text-center" />}
        {children}
      </div>
    </div>
  );
}
