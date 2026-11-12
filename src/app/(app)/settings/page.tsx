import { AccountActions } from "@/app/(app)/settings/_components/AccountActions";
import { BillingPanel } from "@/app/(app)/settings/_components/BillingPanel";
import { DataPanel } from "@/app/(app)/settings/_components/DataPanel";
import { EditorPreferencesSection } from "@/features/editor/components/EditorPreferencesSection";

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your editor, billing, data and account
        </p>
      </header>
      <EditorPreferencesSection />
      <BillingPanel searchParams={searchParams} />
      <DataPanel />
      <AccountActions searchParams={searchParams} />
    </div>
  );
}
