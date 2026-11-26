"use client";

import { useTranslations } from "next-intl";

import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordFormSkeleton } from "@/features/auth/components/forms/ChangePasswordFormSkeleton";

// The section of a user with a password.
export function AccountActionsSkeleton() {
  const t = useTranslations("account");
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <ChangePasswordFormSkeleton />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-6">
        <div>
          <SkeletonText>{t("deleteTitle")}</SkeletonText>
          <SkeletonText className="text-sm">
            {t("deleteDescription")}
          </SkeletonText>
        </div>
        <SkeletonButton>
          <span>{t("deleteTitle")}</span>
        </SkeletonButton>
      </div>
    </section>
  );
}
