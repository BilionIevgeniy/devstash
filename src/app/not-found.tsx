import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";

// Outside the app shell, so a guest sees it too: the homepage suits both, and
// its header offers the dashboard to a signed-in user.
export default async function NotFound() {
  const t = await getTranslations("common.notFound");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ErrorState title={t("title")} description={t("description")}>
        <Button asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
      </ErrorState>
    </main>
  );
}
