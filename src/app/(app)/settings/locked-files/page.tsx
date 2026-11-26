import { titleOf } from "@/app/page-title";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LockedFilesHeader } from "@/app/(app)/settings/locked-files/_components/LockedFilesHeader";
import { PaginationNav } from "@/components/common/lists/PaginationNav";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { LockedFileList } from "@/features/items/components/lists/LockedFileList";
import { LOCKED_FILES_PATH } from "@/features/items/domain/item-fields";
import { getUserLockedFiles } from "@/features/items/services/locked-files";
import { parsePage } from "@/lib/pagination";
import { SETTINGS_PATH } from "@/features/auth/domain/auth-paths";

export const generateMetadata = titleOf("pages.lockedFiles");

// No Suspense: a page change is a navigation in a transition, so the header
// and the pagination stay, with the focus on the link that was used, and the
// rows dim until the next page commits; the first load shows loading.tsx.
export default async function LockedFilesPage({
  searchParams,
}: PageProps<"/settings/locked-files">) {
  const t = await getTranslations("pages.lockedFiles");
  const { id: userId } = await getSessionUser();
  const { isPro } = await getEntitlements(userId);
  if (isPro) redirect(SETTINGS_PATH);

  const files = await getUserLockedFiles(
    userId,
    parsePage((await searchParams).page),
  );

  return (
    <div className="group/list space-y-8">
      <LockedFilesHeader
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={SETTINGS_PATH}>{t("back")}</Link>
            </Button>
            <Button asChild>
              <Link href={UPGRADE_PATH}>{t("renew")}</Link>
            </Button>
          </>
        }
      />
      <div className="transition-opacity group-has-data-pending/list:opacity-50">
        <LockedFileList files={files.items} />
      </div>
      <PaginationNav
        basePath={LOCKED_FILES_PATH}
        page={files.page}
        totalPages={files.totalPages}
      />
    </div>
  );
}
