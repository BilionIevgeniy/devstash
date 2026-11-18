import { AccountActions } from "@/app/(app)/settings/_components/AccountActions";
import { useTranslations } from "next-intl";
import { BillingPanel } from "@/app/(app)/settings/_components/BillingPanel";
import { CustomTypesPanel } from "@/app/(app)/settings/_components/CustomTypesPanel";
import { DataPanel } from "@/app/(app)/settings/_components/DataPanel";
import { EditorPreferencesSection } from "@/features/editor/components/EditorPreferencesSection";

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const t = useTranslations("pages.settings");
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <EditorPreferencesSection />
      <CustomTypesPanel />
      <BillingPanel searchParams={searchParams} />
      <DataPanel />
      <AccountActions />
    </div>
  );
}
