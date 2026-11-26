import { PageHeader } from "@/app/(app)/_components/PageHeader";
import { AccountActionsSkeleton } from "@/app/(app)/settings/_components/AccountActionsSkeleton";
import { AppearanceSkeleton } from "@/app/(app)/settings/_components/AppearanceSkeleton";
import { BillingSectionSkeleton } from "@/features/billing/components/BillingSectionSkeleton";
import { EditorPreferencesSkeleton } from "@/features/editor/components/EditorPreferencesSkeleton";
import { DataSectionSkeleton } from "@/features/import-export/components/DataSectionSkeleton";
import { CustomTypesSkeleton } from "@/features/item-types/components/CustomTypesSkeleton";
import { isStripeTestMode } from "@/lib/vendors/stripe";

// The sections of a Free user with a password and no kept files: a Pro user's
// billing and data differ, and so do custom types.
export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <PageHeader namespace="pages.settings" />
      <AppearanceSkeleton />
      <EditorPreferencesSkeleton />
      <CustomTypesSkeleton />
      <BillingSectionSkeleton testMode={isStripeTestMode()} />
      <DataSectionSkeleton />
      <AccountActionsSkeleton />
    </div>
  );
}
