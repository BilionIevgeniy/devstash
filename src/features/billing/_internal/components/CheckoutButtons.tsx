"use client";
import { useFormatter, useTranslations } from "next-intl";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { OrderReview } from "@/features/billing/_internal/components/OrderReview";
import { usePageRestoreKey } from "@/features/billing/_internal/components/hooks/use-page-restore-key";
import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  proYearlySavingsPercent,
} from "@/features/billing/domain/limits";
import { TestModeHint } from "@/features/billing/components/TestModeHint";
import type { Plan } from "@/features/billing/schemas";

interface CheckoutButtonsProps {
  /** Stripe runs on a test key, so no payment is real. */
  testMode: boolean;
}

function PlanButtons({ testMode }: CheckoutButtonsProps) {
  const format = useFormatter();
  const t = useTranslations("billing.settings");
  const [ordering, setOrdering] = useState<Plan | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOrdering("monthly")}>
          {t("upgradeMonthly", {
            price: format.number(PRO_MONTHLY_PRICE, "price"),
          })}
        </Button>
        <Button variant="outline" onClick={() => setOrdering("yearly")}>
          {t("upgradeYearly", {
            price: format.number(PRO_YEARLY_PRICE, "price"),
            percent: proYearlySavingsPercent(),
          })}
        </Button>
      </div>
      {testMode && <TestModeHint />}
      <OrderReview
        plan={ordering}
        onClose={() => setOrdering(null)}
        testMode={testMode}
      />
    </div>
  );
}

// The choice of a plan in the billing section, then the order step. /upgrade
// chooses by its switch. Mounted fresh after Back from Stripe.
export function CheckoutButtons({ testMode }: CheckoutButtonsProps) {
  return <PlanButtons key={usePageRestoreKey()} testMode={testMode} />;
}
