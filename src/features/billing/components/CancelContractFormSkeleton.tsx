"use client";

import { useTranslations } from "next-intl";

import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";

import { CANCELLATION_KINDS } from "@/features/billing/domain/cancellation";

const FIELDS = ["name", "email"] as const;

// What the § 312k page shows while it reads the session: the signed-out form,
// the common case of a visitor from a footer, at its heights (two fields, the
// kinds, the reason, the button), so the page keeps its length when the form
// arrives. A client component: a server one would read the locale of the request
// and turn the page's static shell dynamic (ADR 0024).
export function CancelContractFormSkeleton() {
  const t = useTranslations("billing.cancel");
  return (
    <div className="space-y-4" aria-hidden="true">
      {FIELDS.map((field) => (
        <div key={field} className="space-y-2">
          <SkeletonText className="text-sm font-medium">
            {t(field)}
          </SkeletonText>
          <Skeleton className="h-8 w-full max-md:h-11" />
        </div>
      ))}
      <div className="space-y-2">
        <SkeletonText className="text-sm font-medium">{t("kind")}</SkeletonText>
        {CANCELLATION_KINDS.map((kind) => (
          <div key={kind} className="flex items-center text-sm max-md:min-h-11">
            <SkeletonText>{t(kind)}</SkeletonText>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <SkeletonText className="text-sm font-medium">
          {t("reason")}
        </SkeletonText>
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-8 w-44 max-md:h-11" />
    </div>
  );
}
