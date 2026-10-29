import { Skeleton } from "@/components/ui/skeleton";

export function ItemDrawerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading item">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-48 w-full" />
      </div>
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
