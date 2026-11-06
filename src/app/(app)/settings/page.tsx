import { AccountActions } from "@/app/(app)/settings/_components/AccountActions";
import { BillingPanel } from "@/app/(app)/settings/_components/BillingPanel";
import { EditorPreferencesSection } from "@/features/editor/components/EditorPreferencesSection";

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your editor, billing and account
        </p>
      </header>
      <EditorPreferencesSection />
      <BillingPanel searchParams={searchParams} />
      <AccountActions />
    </div>
  );
}
