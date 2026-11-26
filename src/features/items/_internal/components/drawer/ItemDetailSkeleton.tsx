import { Pencil, Pin, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { SkeletonButton } from "@/components/common/skeletons/SkeletonButton";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTION_LABEL } from "@/features/items/_internal/components/drawer/action-label";
import { ItemDrawerSkeleton } from "@/features/items/_internal/components/drawer/ItemDrawerSkeleton";
import { editableFields } from "@/features/items/domain/item-fields";
import { cn } from "@/lib/utils";

interface ItemDetailSkeletonProps {
  typeName?: string;
  variant: "sheet" | "page";
}

function ActionBarSkeleton({ typeName }: { typeName?: string }) {
  const t = useTranslations();
  const canCopy = !typeName || editableFields(typeName).file === null;
  return (
    <div className="flex items-center gap-1 border-b px-6 py-3">
      <SkeletonButton className="max-md:min-w-11">
        <Star />
        <span className={ACTION_LABEL}>{t("items.actions.favorite")}</span>
      </SkeletonButton>
      <SkeletonButton className="max-md:min-w-11">
        <Pin />
        <span className={ACTION_LABEL}>{t("items.actions.pin")}</span>
      </SkeletonButton>
      {canCopy && (
        <SkeletonButton className="max-md:min-w-11">
          <Pencil />
          <span className={ACTION_LABEL}>{t("common.actions.copy")}</span>
        </SkeletonButton>
      )}
      <SkeletonButton className="ml-auto max-md:min-w-11">
        <Pencil />
        <span className={ACTION_LABEL}>{t("common.actions.edit")}</span>
      </SkeletonButton>
      <div className="flex max-md:ml-3">
        <Skeleton className="size-8 max-md:size-11" />
      </div>
    </div>
  );
}

// The item routes wait for the whole item, so the skeleton holds its header and
// its action bar too (ItemDrawerHeader, ItemActionBar), then the body.
export function ItemDetailSkeleton({
  typeName,
  variant,
}: ItemDetailSkeletonProps) {
  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 p-6 pb-2",
          variant === "sheet" ? "pr-12" : "pr-6",
        )}
      >
        <Skeleton className="size-12 shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <ActionBarSkeleton typeName={typeName} />
      <ItemDrawerSkeleton
        typeName={typeName}
        className="flex-1 overflow-y-auto p-6"
      />
    </>
  );
}
