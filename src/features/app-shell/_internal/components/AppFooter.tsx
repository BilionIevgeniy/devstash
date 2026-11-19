import Link from "next/link";
import { useTranslations } from "next-intl";

import { PrivacySettingsButton } from "@/components/common/consent/PrivacySettingsButton";
import { CANCEL_CONTRACTS_PATH } from "@/lib/http/legal-paths";

// Below every page of the app, so the § 312k BGB link and the privacy settings
// (the consent banner again, ADR 0034) are always in reach, also on a phone,
// where the sidebar and its user menu stay closed.
export function AppFooter() {
  const t = useTranslations("shell");
  return (
    <footer className="mt-12 flex flex-wrap gap-x-4 border-t pt-4 text-xs text-muted-foreground">
      <Link
        href={CANCEL_CONTRACTS_PATH}
        prefetch={false}
        lang="de"
        className="inline-flex items-center underline-offset-4 hover:text-foreground hover:underline max-md:min-h-11"
      >
        {t("cancelContracts")}
      </Link>
      <PrivacySettingsButton className="inline-flex items-center underline-offset-4 hover:text-foreground hover:underline max-md:min-h-11" />
    </footer>
  );
}
