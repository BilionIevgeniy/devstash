import { PageHeader } from "@/app/(app)/_components/PageHeader";
import { AccountActions } from "@/app/(app)/settings/_components/AccountActions";
import { AppearancePanel } from "@/app/(app)/settings/_components/AppearancePanel";
import { BillingPanel } from "@/app/(app)/settings/_components/BillingPanel";
import { CustomTypesPanel } from "@/app/(app)/settings/_components/CustomTypesPanel";
import { DataPanel } from "@/app/(app)/settings/_components/DataPanel";
import { EditorPreferencesSection } from "@/features/editor/components/EditorPreferencesSection";

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="space-y-8">
      <PageHeader namespace="pages.settings" />
      <AppearancePanel />
      <EditorPreferencesSection />
      <CustomTypesPanel />
      <BillingPanel searchParams={searchParams} />
      <DataPanel />
      <AccountActions />
    </div>
  );
}
