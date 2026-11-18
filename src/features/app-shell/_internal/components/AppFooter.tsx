import Link from "next/link";
import { useTranslations } from "next-intl";

import { CANCEL_CONTRACTS_PATH } from "@/lib/http/legal-paths";

// Below every page of the app, so the § 312k BGB link is always in reach,
// also on a phone, where the sidebar and its user menu stay closed.
export function AppFooter() {
  const t = useTranslations("shell");
  return (
    <footer className="mt-12 border-t pt-4 text-xs text-muted-foreground">
      <Link
        href={CANCEL_CONTRACTS_PATH}
        lang="de"
        className="underline-offset-4 hover:text-foreground hover:underline"
      >
        {t("cancelContracts")}
      </Link>
    </footer>
  );
}
