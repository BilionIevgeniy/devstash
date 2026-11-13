import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import { proYearlySavingsPercent } from "@/features/billing/domain/limits";

interface BillingToggleProps {
  yearly: boolean;
  onChange: (yearly: boolean) => void;
  /** A Checkout is starting: the period can no longer change. */
  disabled?: boolean;
}

export function BillingToggle({
  yearly,
  onChange,
  disabled = false,
}: BillingToggleProps) {
  const t = useTranslations("billing.toggle");

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
      <span>{t("monthly")}</span>
      <Switch
        aria-label={t("label")}
        checked={yearly}
        onCheckedChange={onChange}
        disabled={disabled}
        className="px-px data-checked:bg-[#8b5cf6] data-[size=default]:h-6 data-[size=default]:w-11 *:data-[slot=switch-thumb]:size-4.5! *:data-[slot=switch-thumb]:bg-foreground! [&[data-state=checked]>[data-slot=switch-thumb]]:translate-x-5.5!"
      />
      <span>{t("yearly")}</span>
      <span className="rounded-full border px-2 py-0.5 text-xs text-foreground">
        {t("save", { percent: proYearlySavingsPercent() })}
      </span>
    </div>
  );
}
