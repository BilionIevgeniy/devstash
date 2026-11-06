"use client";

import { CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BillingActions } from "@/features/billing/_internal/components/BillingActions";
import { useCheckoutReturn } from "@/features/billing/_internal/components/hooks/use-checkout-return";
import { useUpgradeNotice } from "@/features/billing/_internal/components/hooks/use-upgrade-notice";
import { UsageSummary } from "@/features/billing/_internal/components/UsageSummary";
import type { BillingOverview } from "@/features/billing/types";

interface BillingSectionProps extends BillingOverview {
  itemCount: number;
  collectionCount: number;
  checkoutSessionId: string | null;
  /** The user was sent here from a Pro page. */
  upgradeRequested: boolean;
}

export function BillingSection({
  isPro,
  hasBillingAccount,
  paymentIssue,
  itemCount,
  collectionCount,
  checkoutSessionId,
  upgradeRequested,
}: BillingSectionProps) {
  const { isConfirming } = useCheckoutReturn(checkoutSessionId, isPro);
  useUpgradeNotice(upgradeRequested, isPro);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CreditCard className="size-4 text-muted-foreground" />
        Billing
      </h2>
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-medium">Plan</h3>
          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro ? "Pro" : "Free"}
          </Badge>
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
          />
        )}
      </div>
    </section>
  );
}
