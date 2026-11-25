import { useTranslations } from "next-intl";

// The header of /upgrade, which its loading state shows too: it needs no data.
export function UpgradeHeader() {
  const t = useTranslations("billing.upgradePage");
  return (
    <header className="text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("lead")}</p>
    </header>
  );
}
