"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBillingRedirect } from "@/features/billing/_internal/components/hooks/use-billing-redirect";
import { startCheckout } from "@/features/billing/actions/checkout";
import { TestModeHint } from "@/features/billing/components/TestModeHint";
import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
} from "@/features/billing/domain/limits";
import type { Plan } from "@/features/billing/schemas";
import { TERMS_PATH, withdrawalPath } from "@/lib/http/legal-paths";

interface OrderReviewProps {
  /** The plan to order; null keeps the dialog closed. */
  plan: Plan | null;
  onClose: () => void;
  testMode: boolean;
}

const LINK = "underline underline-offset-4";

function ConsentBox({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 text-sm/relaxed">
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

function OrderSummary({ plan }: { plan: Plan }) {
  const t = useTranslations("billing.order");
  const format = useFormatter();
  const price = format.number(
    plan === "yearly" ? PRO_YEARLY_PRICE : PRO_MONTHLY_PRICE,
    "price",
  );
  return (
    <div className="space-y-2">
      <p className="text-2xl font-semibold">
        {t("price", { price, period: plan })}
      </p>
      <p className="text-sm text-muted-foreground">{t("vat")}</p>
      <p className="text-sm text-muted-foreground">
        {t("renewal", { period: plan })}
      </p>
    </div>
  );
}

// The step before Stripe (§ 312j BGB, § 356 (5) BGB, ADR 0032): what is
// ordered and what it costs, the terms, and the consent to the immediate
// start, then a button that says the order is payable. The server refuses an
// order without both consents too.
export function OrderReview({ plan, onClose, testMode }: OrderReviewProps) {
  const t = useTranslations("billing.order");
  const lang = useLocale() === "de" ? "de" : "en";
  const { isPending, run } = useBillingRedirect();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [waiveWithdrawal, setWaiveWithdrawal] = useState(false);
  // The last plan stays in the dialog while it slides out, so a yearly order
  // does not close on the monthly price.
  const [lastPlan, setLastPlan] = useState<Plan>(plan ?? "monthly");
  if (plan !== null && plan !== lastPlan) setLastPlan(plan);
  const period = plan ?? lastPlan;

  // A consent never comes back ticked: closing clears both boxes, so another
  // plan, or the same one again, is agreed to afresh.
  function handleOpenChange(open: boolean) {
    if (open || isPending) return;
    setAcceptTerms(false);
    setWaiveWithdrawal(false);
    onClose();
  }

  function order() {
    if (!plan) return;
    run(() => startCheckout({ plan, acceptTerms, waiveWithdrawal }));
  }

  return (
    <Dialog open={plan !== null} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { period })}</DialogDescription>
        </DialogHeader>
        <OrderSummary plan={period} />
        <div className="space-y-3">
          <ConsentBox
            checked={acceptTerms}
            onChange={setAcceptTerms}
            disabled={isPending}
          >
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <Link href={TERMS_PATH} target="_blank" className={LINK}>
                  {chunks}
                </Link>
              ),
              withdrawal: (chunks) => (
                <Link
                  href={withdrawalPath(lang)}
                  target="_blank"
                  className={LINK}
                >
                  {chunks}
                </Link>
              ),
            })}
          </ConsentBox>
          <ConsentBox
            checked={waiveWithdrawal}
            onChange={setWaiveWithdrawal}
            disabled={isPending}
          >
            {t("waiveWithdrawal")}
          </ConsentBox>
        </div>
        <p className="text-xs text-muted-foreground">{t("next")}</p>
        {testMode && <TestModeHint />}
        <DialogFooter>
          <Button
            onClick={order}
            disabled={isPending || !acceptTerms || !waiveWithdrawal}
          >
            {isPending && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {isPending ? t("pending") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
