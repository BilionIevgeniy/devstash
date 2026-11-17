import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 6;

export function LockedFileListSkeleton() {
  return (
    <div className="divide-y rounded-lg border">
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
