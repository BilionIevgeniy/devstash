"use client";

import { CreditCard } from "lucide-react";
import type { ReactNode } from "react";

import { BillingActions } from "@/features/billing/_internal/components/BillingActions";
import { useCheckoutReturn } from "@/features/billing/_internal/components/hooks/use-checkout-return";
import { UsageSummary } from "@/features/billing/_internal/components/UsageSummary";
import { PlanBadge } from "@/features/billing/components/PlanBadge";
import type { BillingOverview } from "@/features/billing/types";

interface BillingSectionProps extends BillingOverview {
  itemCount: number;
  collectionCount: number;
  checkoutSessionId: string | null;
  /** Stripe runs on a test key, so no payment is real. */
  testMode: boolean;
  /** A row at the end of the card, filled by the page: billing knows no items. */
  children?: ReactNode;
}

export function BillingSection({
  isPro,
  hasBillingAccount,
  paymentIssue,
  itemCount,
  collectionCount,
  checkoutSessionId,
  testMode,
  children,
}: BillingSectionProps) {
  const { isConfirming } = useCheckoutReturn(checkoutSessionId, isPro);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CreditCard className="size-4 text-muted-foreground" />
        Billing
      </h2>
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-medium">Plan</h3>
          <PlanBadge isPro={isPro} />
        </div>
        {!isPro && (
          <UsageSummary
            itemCount={itemCount}
            collectionCount={collectionCount}
          />
        )}
        {isConfirming ? (
          <p className="text-sm text-muted-foreground" role="status">
            Confirming your payment…
          </p>
        ) : (
          <BillingActions
            isPro={isPro}
            hasBillingAccount={hasBillingAccount}
            paymentIssue={paymentIssue}
            testMode={testMode}
          />
        )}
        {children}
      </div>
    </section>
  );
}
