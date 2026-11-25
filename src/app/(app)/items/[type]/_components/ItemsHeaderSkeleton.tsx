import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { SkeletonText } from "@/components/common/skeletons/SkeletonText";
import { Skeleton } from "@/components/ui/skeleton";
import { typeLabel } from "@/features/item-types/domain/item-type";

interface ItemsHeaderSkeletonProps {
  /** Null for a custom type, whose name the URL does not hold. */
  typeName: string | null;
}

// The title and the button of ItemsHeader, as wide as the type's words, so the
// header wraps where it will. A custom type's words are not known yet.
export function ItemsHeaderSkeleton({ typeName }: ItemsHeaderSkeletonProps) {
  const t = useTranslations();
  const words = useTranslations("itemTypes");
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {typeName === null ? (
          <Skeleton className="h-9 w-40" />
        ) : (
          <SkeletonText className="pl-10 text-3xl font-bold">
            {typeLabel(words, typeName, "other")}
          </SkeletonText>
        )}
        <div className="flex h-6 items-center">
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      {typeName === null ? (
        <Skeleton className="h-8 w-32 max-md:h-11" />
      ) : (
        <SkeletonButton>
          <Plus />
          <span>
            {t("items.create.newType", {
              type: typeLabel(words, typeName, "one"),
            })}
          </span>
        </SkeletonButton>
      )}
    </header>
  );
}
