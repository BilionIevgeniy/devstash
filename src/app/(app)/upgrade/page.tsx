import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { ProUpgradePanel } from "@/features/billing/components/ProUpgradePanel";
import { getEntitlements } from "@/features/billing/queries";
import { LockedFilesRow } from "@/features/items/components/LockedFilesRow";
import { getUserLockedFileCount } from "@/features/items/services/locked-files";
import { isStripeTestMode } from "@/lib/stripe";

export default async function UpgradePage() {
  const { id: userId } = await getSessionUser();
  const [{ isPro }, lockedCount] = await Promise.all([
    getEntitlements(userId),
    getUserLockedFileCount(userId),
  ]);
  if (isPro) redirect("/settings");

  return (
    <ProUpgradePanel testMode={isStripeTestMode()}>
      <LockedFilesRow count={lockedCount} />
    </ProUpgradePanel>
  );
}
