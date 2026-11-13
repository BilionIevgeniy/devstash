import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PaginationNav } from "@/components/common/PaginationNav";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { getEntitlements } from "@/features/billing/queries";
import { LockedFileList } from "@/features/items/components/LockedFileList";
import { LockedFileListSkeleton } from "@/features/items/components/LockedFileListSkeleton";
import { LOCKED_FILES_PATH } from "@/features/items/domain/item-fields";
import { getUserLockedFiles } from "@/features/items/services/locked-files";
import { parsePage } from "@/lib/pagination";

async function LockedFilesContent({ page }: { page: number }) {
  const { id: userId } = await getSessionUser();
  const files = await getUserLockedFiles(userId, page);

  return (
    <>
      <LockedFileList files={files.items} />
      <PaginationNav
        basePath={LOCKED_FILES_PATH}
        page={files.page}
        totalPages={files.totalPages}
      />
    </>
  );
}

// loading.tsx does not show when only the query string changes, since the
// segment stays the same: the key gives each page its own loading state.
export default async function LockedFilesPage({
  searchParams,
}: PageProps<"/settings/locked-files">) {
  const t = await getTranslations("pages.lockedFiles");
  const { id: userId } = await getSessionUser();
  const { isPro } = await getEntitlements(userId);
  if (isPro) redirect("/settings");

  const page = parsePage((await searchParams).page);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("lead")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/settings">{t("back")}</Link>
          </Button>
          <Button asChild>
            <Link href={UPGRADE_PATH}>{t("renew")}</Link>
          </Button>
        </div>
      </header>
      <Suspense key={page} fallback={<LockedFileListSkeleton />}>
        <LockedFilesContent page={page} />
      </Suspense>
    </div>
  );
}
