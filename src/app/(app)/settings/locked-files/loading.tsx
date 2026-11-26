import { useTranslations } from "next-intl";

import { LockedFilesHeader } from "@/app/(app)/settings/locked-files/_components/LockedFilesHeader";
import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { LockedFileListSkeleton } from "@/features/items/components/lists/LockedFileListSkeleton";

// The plan is not known yet, so the way to renew is not offered: a user who
// has renewed since would see it until the page leaves for the settings. No
// link stands here at all, or it would lose the focus when the page comes.
export default function LockedFilesLoading() {
  const t = useTranslations("pages.lockedFiles");
  return (
    <div className="space-y-8">
      <LockedFilesHeader
        actions={
          <>
            <SkeletonButton>{t("back")}</SkeletonButton>
            <SkeletonButton>{t("renew")}</SkeletonButton>
          </>
        }
      />
      <LockedFileListSkeleton />
    </div>
  );
}
