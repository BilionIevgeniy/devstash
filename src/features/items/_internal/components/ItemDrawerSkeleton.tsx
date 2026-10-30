import { Skeleton } from "@/components/ui/skeleton";
import { editableFields } from "@/features/items/domain/item-fields";

// Shared with the file view in ItemDrawerContent, so the skeleton of a file or
// image item has the size of what replaces it.
export const FILE_PREVIEW_HEIGHT = "h-64";
export const FILE_ROW_HEIGHT = "h-16";

interface ItemDrawerSkeletonProps {
  /** Unknown on a route that has not read its params yet. */
  typeName?: string;
}

export function ItemDrawerSkeleton({ typeName }: ItemDrawerSkeletonProps) {
  const fileKind = typeName ? editableFields(typeName).file : null;

  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading item">
      {fileKind ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <div className="space-y-3">
            {fileKind === "image" && (
              <Skeleton className={`${FILE_PREVIEW_HEIGHT} w-full`} />
            )}
            <Skeleton className={`${FILE_ROW_HEIGHT} w-full`} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
