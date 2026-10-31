import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shared with FileList and FileRow, so the skeleton has the frame and row
// height of the list that replaces it. Kept apart from the list: the client
// loading.tsx imports only this file. overflow-hidden keeps the hover
// background of the first and last rows inside the rounded corners.
export const FILE_LIST = "divide-y overflow-hidden rounded-lg border bg-card";
export const FILE_ROW_HEIGHT = "h-16 sm:h-14";

const ROW_COUNT = 6;

export function FileListSkeleton() {
  return (
    <div className={FILE_LIST}>
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <div
          key={index}
          className={cn("flex items-center gap-3 pl-4", FILE_ROW_HEIGHT)}
        >
          <Skeleton className="size-5 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="flex w-12 shrink-0 justify-center">
            <Skeleton className="size-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
