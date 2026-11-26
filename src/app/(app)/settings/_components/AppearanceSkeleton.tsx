"use client";

import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { ThemePickerView } from "@/components/common/theme/ThemePickerView";
import { useTranslations } from "next-intl";

// The picker's own placeholder, not the live one: a control in a loading state
// would lose the focus when the page replaces it.
export function AppearanceSkeleton() {
  const t = useTranslations("common.theme");
  return (
    <section className="space-y-4">
      <SkeletonText className="h-7 text-lg font-semibold">
        {t("label")}
      </SkeletonText>
      <div className="rounded-lg border bg-card p-6">
        <ThemePickerView
          theme={undefined}
          onChange={() => {}}
          legendClassName="sr-only"
        />
      </div>
    </section>
  );
}
