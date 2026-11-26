"use client";

import { BillingToggle } from "@/features/billing/components/BillingToggle";
import { PricingCard } from "@/features/billing/components/PricingCard";
import { PricingCardButton } from "@/features/billing/components/PricingCardButton";
import { PricingGrid } from "@/features/billing/components/PricingGrid";
import { usePlanText } from "@/features/billing/components/hooks/use-plan-text";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
} from "@/features/billing/domain/limits";
import { TestModeHint } from "@/features/billing/components/TestModeHint";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

// A card as large as the one it stands for, which is unseen inside it: its
// height is that of lines that wrap. `inert`, since it holds controls.
function CardSkeleton({ children }: { children: ReactNode }) {
  return (
    <Skeleton aria-hidden inert className="h-full rounded-[14px]">
      <div className="invisible h-full">{children}</div>
    </Skeleton>
  );
}

interface UpgradePlansSkeletonProps {
  /** Stripe runs on a test key: the hint is under the plans. */
  testMode: boolean;
}

// The plans of /upgrade while the page reads the user's own plan. A user with
// kept files has a row more below them.
export function UpgradePlansSkeleton({ testMode }: UpgradePlansSkeletonProps) {
  const plan = usePlanText();
  return (
    <>
      <PricingGrid
        toggle={
          <Skeleton aria-hidden inert className="mx-auto w-fit rounded-full">
            <div className="invisible">
              <BillingToggle yearly={false} onChange={() => {}} />
            </div>
          </Skeleton>
        }
        free={
          <CardSkeleton>
            <PricingCard
              {...plan.free}
              features={plan.features(FREE_PLAN_FEATURES)}
              action={
                <PricingCardButton variant="outline">
                  {plan.t("plans.currentPlan")}
                </PricingCardButton>
              }
            />
          </CardSkeleton>
        }
        pro={
          <CardSkeleton>
            <PricingCard
              {...plan.pro(false)}
              features={plan.features(PRO_PLAN_FEATURES)}
              action={
                <PricingCardButton>{plan.t("plans.upgrade")}</PricingCardButton>
              }
            />
          </CardSkeleton>
        }
      />
      <div className="mx-auto max-w-xl space-y-4">
        {testMode && (
          <Skeleton aria-hidden>
            <TestModeHint className="invisible text-center" />
          </Skeleton>
        )}
      </div>
    </>
  );
}
