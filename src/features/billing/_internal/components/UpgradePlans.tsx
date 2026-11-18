"use client";

import { useState } from "react";

import { OrderReview } from "@/features/billing/_internal/components/OrderReview";
import { usePageRestoreKey } from "@/features/billing/_internal/components/hooks/use-page-restore-key";
import { BillingToggle } from "@/features/billing/components/BillingToggle";
import { PricingCard } from "@/features/billing/components/PricingCard";
import { PricingCardButton } from "@/features/billing/components/PricingCardButton";
import { PricingGrid } from "@/features/billing/components/PricingGrid";
import { usePlanText } from "@/features/billing/components/hooks/use-plan-text";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
} from "@/features/billing/domain/limits";
import type { Plan } from "@/features/billing/schemas";

interface UpgradePlansProps {
  /** Stripe runs on a test key, so no payment is real. */
  testMode: boolean;
}

// The homepage's pricing table for a signed-in Free user: the switch chooses the
// period, and the button opens the order step for it. The switch holds still
// while the step is open, or the card could show another price than the one
// ordered.
function Plans({ testMode }: UpgradePlansProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [ordering, setOrdering] = useState<Plan | null>(null);
  const plan = usePlanText();

  return (
    <>
      <PricingGrid
        toggle={
          <BillingToggle
            yearly={isYearly}
            onChange={setIsYearly}
            disabled={ordering !== null}
          />
        }
        free={
          <PricingCard
            {...plan.free}
            features={plan.features(FREE_PLAN_FEATURES)}
            action={
              <PricingCardButton variant="outline" disabled>
                {plan.t("plans.currentPlan")}
              </PricingCardButton>
            }
          />
        }
        pro={
          <PricingCard
            {...plan.pro(isYearly)}
            features={plan.features(PRO_PLAN_FEATURES)}
            highlighted
            action={
              <PricingCardButton
                onClick={() => setOrdering(isYearly ? "yearly" : "monthly")}
              >
                {plan.t("plans.upgrade")}
              </PricingCardButton>
            }
          />
        }
      />
      <OrderReview
        plan={ordering}
        onClose={() => setOrdering(null)}
        testMode={testMode}
      />
    </>
  );
}

// Mounted fresh after Back from Stripe (usePageRestoreKey).
export function UpgradePlans({ testMode }: UpgradePlansProps) {
  return <Plans key={usePageRestoreKey()} testMode={testMode} />;
}
