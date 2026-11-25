import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";

// A missing item, collection or type keeps the sidebar and top bar around it,
// in the language of the app. The root not-found has a <main> of its own,
// which would stand inside the shell's.
export default async function AppNotFound() {
  const t = await getTranslations("common.appNotFound");
  return (
    <ErrorState title={t("title")} description={t("description")}>
      <Button asChild>
        <Link href="/dashboard">{t("home")}</Link>
      </Button>
    </ErrorState>
  );
}
