import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useBillingRedirect } from "@/features/billing/_internal/components/hooks/use-billing-redirect";
import {
  openBillingPortal,
  startCheckout,
} from "@/features/billing/actions/checkout";
import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  proYearlySavingsPercent,
} from "@/features/billing/domain/limits";
import type { Plan } from "@/features/billing/schemas";
import type { ActionResult } from "@/lib/action-result";

const PAYMENT_ISSUE =
  "Your last payment didn't go through. Open Manage Billing to fix it.";

type BillingTarget = Plan | "portal";

interface BillingButtonProps {
  label: string;
  variant: "default" | "outline";
  isPending: boolean;
  isActive: boolean;
  onClick: () => void;
}

function BillingButton({
  label,
  variant,
  isPending,
  isActive,
  onClick,
}: BillingButtonProps) {
  return (
    <Button variant={variant} disabled={isPending} onClick={onClick}>
      {isPending && isActive && (
        <Loader2 className="animate-spin" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

interface BillingActionsProps {
  isPro: boolean;
  hasBillingAccount: boolean;
  paymentIssue: boolean;
}

export function BillingActions({
  isPro,
  hasBillingAccount,
  paymentIssue,
}: BillingActionsProps) {
  const { isPending, run } = useBillingRedirect();
  const [active, setActive] = useState<BillingTarget | null>(null);

  function start(target: BillingTarget, action: () => Promise<ActionResult>) {
    setActive(target);
    run(action);
  }

  if (isPro && !hasBillingAccount) return null;

  if (isPro) {
    return (
      <div className="space-y-4">
        {paymentIssue && <p className="text-sm">{PAYMENT_ISSUE}</p>}
        <BillingButton
          label="Manage Billing"
          variant="outline"
          isPending={isPending}
          isActive={active === "portal"}
          onClick={() => start("portal", openBillingPortal)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <BillingButton
        label={`Upgrade $${PRO_MONTHLY_PRICE}/mo`}
        variant="default"
        isPending={isPending}
        isActive={active === "monthly"}
        onClick={() => start("monthly", () => startCheckout("monthly"))}
      />
      <BillingButton
        label={`Upgrade $${PRO_YEARLY_PRICE}/yr (save ${proYearlySavingsPercent()}%)`}
        variant="outline"
        isPending={isPending}
        isActive={active === "yearly"}
        onClick={() => start("yearly", () => startCheckout("yearly"))}
      />
    </div>
  );
}
