"use client";

import { useState } from "react";

import { BillingButton } from "@/features/billing/_internal/components/BillingButton";
import { useBillingRedirect } from "@/features/billing/_internal/components/hooks/use-billing-redirect";
import { startCheckout } from "@/features/billing/actions/checkout";
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

// The choice of a plan in the billing section. /upgrade chooses by its switch.
export function CheckoutButtons({ testMode }: CheckoutButtonsProps) {
  const { isPending, run } = useBillingRedirect();
  const [active, setActive] = useState<Plan | null>(null);

  function start(plan: Plan) {
    setActive(plan);
    run(() => startCheckout(plan));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <BillingButton
          label={`Upgrade $${PRO_MONTHLY_PRICE}/mo`}
          variant="default"
          isPending={isPending}
          isActive={active === "monthly"}
          onClick={() => start("monthly")}
        />
        <BillingButton
          label={`Upgrade $${PRO_YEARLY_PRICE}/yr (save ${proYearlySavingsPercent()}%)`}
          variant="outline"
          isPending={isPending}
          isActive={active === "yearly"}
          onClick={() => start("yearly")}
        />
      </div>
      {testMode && <TestModeHint />}
    </div>
  );
}
