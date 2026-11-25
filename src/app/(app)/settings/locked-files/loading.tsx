import { useTranslations } from "next-intl";

import { LockedFilesHeader } from "@/app/(app)/settings/locked-files/_components/LockedFilesHeader";
import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { LockedFileListSkeleton } from "@/features/items/components/lists/LockedFileListSkeleton";

// The plan is not known yet, so the way to renew is not offered: a user who
// has renewed since would see it until the page leaves for the settings.
export default function LockedFilesLoading() {
  const t = useTranslations("pages.lockedFiles");
  return (
    <div className="space-y-8">
      <LockedFilesHeader
        renew={
          <SkeletonButton>
            <span>{t("renew")}</span>
          </SkeletonButton>
        }
      />
      <LockedFileListSkeleton />
    </div>
  );
}
