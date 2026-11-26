import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 6;

// The lines and the two controls of LockedFileRow.
export function LockedFileListSkeleton() {
  return (
    <div className="divide-y rounded-lg border bg-card">
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex h-5 items-center">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex h-4 items-center">
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="size-8 max-md:size-11" />
          <Skeleton className="size-8 max-md:size-11" />
        </div>
      ))}
    </div>
  );
}
