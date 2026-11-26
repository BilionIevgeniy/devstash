import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { editableFields } from "@/features/items/domain/item-fields";
import { cn } from "@/lib/utils";

// Shared with the file view in ItemDrawerContent, so the skeleton of a file or
// image item has the size of what replaces it.
export const FILE_PREVIEW_HEIGHT = "h-64";
export const FILE_ROW_HEIGHT = "h-16";

interface ItemDrawerSkeletonProps {
  /** Unknown on a route that has not read its params yet. */
  typeName?: string;
  className?: string;
}

export function ItemDrawerSkeleton({
  typeName,
  className,
}: ItemDrawerSkeletonProps) {
  const t = useTranslations("items.drawer");
  const fileKind = typeName ? editableFields(typeName).file : null;

  return (
    <div
      className={cn("space-y-6", className)}
      role="status"
      aria-busy="true"
      aria-label={t("loading")}
    >
      {fileKind ? (
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <div className="space-y-3">
            {fileKind === "image" && (
              <Skeleton className={`${FILE_PREVIEW_HEIGHT} w-full`} />
            )}
            <Skeleton className={`${FILE_ROW_HEIGHT} w-full`} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        {/* A line of the text around it: the sheet's is smaller than a page's. */}
        <div className="space-y-1">
          <div className="flex h-lh items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex h-lh items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
