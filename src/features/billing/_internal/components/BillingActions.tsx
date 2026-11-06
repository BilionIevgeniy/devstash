import { BillingButton } from "@/features/billing/_internal/components/BillingButton";
import { CheckoutButtons } from "@/features/billing/_internal/components/CheckoutButtons";
import { useBillingRedirect } from "@/features/billing/_internal/components/hooks/use-billing-redirect";
import { openBillingPortal } from "@/features/billing/actions/checkout";

const PAYMENT_ISSUE =
  "Your last payment didn't go through. Open Manage Billing to fix it.";

interface BillingActionsProps {
  isPro: boolean;
  hasBillingAccount: boolean;
  paymentIssue: boolean;
  testMode: boolean;
}

export function BillingActions({
  isPro,
  hasBillingAccount,
  paymentIssue,
  testMode,
}: BillingActionsProps) {
  const { isPending, run } = useBillingRedirect();

  if (!isPro) return <CheckoutButtons testMode={testMode} />;
  if (!hasBillingAccount) return null;

  return (
    <div className="space-y-4">
      {paymentIssue && <p className="text-sm">{PAYMENT_ISSUE}</p>}
      <BillingButton
        label="Manage Billing"
        variant="outline"
        isPending={isPending}
        isActive
        onClick={() => run(openBillingPortal)}
      />
    </div>
  );
}
