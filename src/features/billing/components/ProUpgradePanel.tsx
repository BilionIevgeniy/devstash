import type { ReactNode } from "react";

import { TestModeHint } from "@/features/billing/_internal/components/TestModeHint";
import { UpgradePlans } from "@/features/billing/_internal/components/UpgradePlans";

interface ProUpgradePanelProps {
  /** Stripe runs on a test key, so no payment is real. */
  testMode: boolean;
  /** A row below the plans, filled by the page: billing knows no items. */
  children?: ReactNode;
}

export function ProUpgradePanel({ testMode, children }: ProUpgradePanelProps) {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Upgrade to Pro</h1>
        <p className="text-muted-foreground">
          Keep everything in one place, with no limits
        </p>
      </header>
      <UpgradePlans />
      <div className="mx-auto max-w-xl space-y-4">
        {testMode && <TestModeHint className="text-center" />}
        {children}
      </div>
    </div>
  );
}
