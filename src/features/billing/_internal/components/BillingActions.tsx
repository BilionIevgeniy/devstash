import { BillingButton } from "@/features/billing/_internal/components/BillingButton";
import { useTranslations } from "next-intl";
import { CheckoutButtons } from "@/features/billing/_internal/components/CheckoutButtons";
import { useBillingRedirect } from "@/features/billing/_internal/components/hooks/use-billing-redirect";
import { openBillingPortal } from "@/features/billing/actions/checkout";

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
  const t = useTranslations("billing.settings");
  const { isPending, run } = useBillingRedirect();

  if (!isPro) return <CheckoutButtons testMode={testMode} />;
  if (!hasBillingAccount) return null;

  return (
    <div className="space-y-4">
      {paymentIssue && <p className="text-sm">{t("paymentIssue")}</p>}
      <BillingButton
        label={t("manage")}
        variant="outline"
        isPending={isPending}
        isActive
        onClick={() => run(openBillingPortal)}
      />
    </div>
  );
}
