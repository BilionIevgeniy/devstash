"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { useBillingRedirect } from "@/features/billing/_internal/components/hooks/use-billing-redirect";
import { startCheckout } from "@/features/billing/actions/checkout";
import { BillingToggle } from "@/features/billing/components/BillingToggle";
import { PricingCard } from "@/features/billing/components/PricingCard";
import { PricingCardButton } from "@/features/billing/components/PricingCardButton";
import { PricingGrid } from "@/features/billing/components/PricingGrid";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  proPriceDisplay,
} from "@/features/billing/domain/limits";

// The homepage's pricing table for a signed-in Free user: the switch chooses the
// period, so one button starts Checkout. It holds still once that has started,
// or the card could show another price than the one Stripe opens with.
export function UpgradePlans() {
  const [isYearly, setIsYearly] = useState(false);
  const { isPending, run } = useBillingRedirect();

  return (
    <PricingGrid
      toggle={
        <BillingToggle
          yearly={isYearly}
          onChange={setIsYearly}
          disabled={isPending}
        />
      }
      free={
        <PricingCard
          name="Free"
          price="$0"
          note="Free forever"
          features={FREE_PLAN_FEATURES}
          action={
            <PricingCardButton variant="outline" disabled>
              Current plan
            </PricingCardButton>
          }
        />
      }
      pro={
        <PricingCard
          name="Pro"
          {...proPriceDisplay(isYearly)}
          features={PRO_PLAN_FEATURES}
          highlighted
          action={
            <PricingCardButton
              disabled={isPending}
              onClick={() =>
                run(() => startCheckout(isYearly ? "yearly" : "monthly"))
              }
            >
              {isPending && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Upgrade to Pro
            </PricingCardButton>
          }
        />
      }
    />
  );
}
