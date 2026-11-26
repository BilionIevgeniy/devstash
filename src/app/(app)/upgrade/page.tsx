import { titleOf } from "@/app/page-title";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { ProUpgradePanel } from "@/features/billing/components/upgrade/ProUpgradePanel";
import { getEntitlements } from "@/features/billing/queries";
import { LockedFilesRow } from "@/features/items/components/lists/LockedFilesRow";
import { getUserLockedFileCount } from "@/features/items/services/locked-files";
import { isStripeTestMode } from "@/lib/vendors/stripe";
import { SETTINGS_PATH } from "@/features/auth/domain/auth-paths";

export const generateMetadata = titleOf("billing.upgradePage");

export default async function UpgradePage() {
  const { id: userId } = await getSessionUser();
  const [{ isPro }, lockedCount] = await Promise.all([
    getEntitlements(userId),
    getUserLockedFileCount(userId),
  ]);
  if (isPro) redirect(SETTINGS_PATH);

  return (
    <ProUpgradePanel testMode={isStripeTestMode()}>
      <LockedFilesRow count={lockedCount} />
    </ProUpgradePanel>
  );
}
