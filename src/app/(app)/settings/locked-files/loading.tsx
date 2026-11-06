import { Skeleton } from "@/components/ui/skeleton";
import { LockedFileListSkeleton } from "@/features/items/components/LockedFileListSkeleton";

export default function LockedFilesLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-5 w-96 max-w-full" />
      </header>
      <LockedFileListSkeleton />
    </div>
  );
}
