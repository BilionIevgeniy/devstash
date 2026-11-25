import { UpgradeHeader } from "@/features/billing/components/upgrade/UpgradeHeader";
import { UpgradePlansSkeleton } from "@/features/billing/components/upgrade/UpgradePlansSkeleton";

export default function UpgradeLoading() {
  return (
    <div className="space-y-8">
      <UpgradeHeader />
      <UpgradePlansSkeleton />
    </div>
  );
}
