import { Switch } from "@/components/ui/switch";
import { proYearlySavingsPercent } from "@/features/billing/domain/limits";

interface BillingToggleProps {
  yearly: boolean;
  onChange: (yearly: boolean) => void;
}

export function BillingToggle({ yearly, onChange }: BillingToggleProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
      <span>Monthly</span>
      <Switch
        aria-label="Yearly billing"
        checked={yearly}
        onCheckedChange={onChange}
        className="px-px data-checked:bg-[#8b5cf6] data-[size=default]:h-6 data-[size=default]:w-11 [&>[data-slot=switch-thumb]]:size-4.5! [&>[data-slot=switch-thumb]]:bg-foreground! [&[data-state=checked]>[data-slot=switch-thumb]]:translate-x-5.5!"
      />
      <span>Yearly</span>
      <span className="rounded-full border px-2 py-0.5 text-xs text-foreground">
        Save {proYearlySavingsPercent()}%
      </span>
    </div>
  );
}
