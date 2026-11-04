import { AccountActions } from "@/app/(app)/settings/_components/AccountActions";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </header>
      <AccountActions />
    </div>
  );
}
