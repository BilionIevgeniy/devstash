import { Skeleton } from "@/components/ui/skeleton";

const TYPE_ROWS = 7;
const COLLECTION_ROWS = 4;

function GroupSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-1">
      <Skeleton className="mb-2 h-4 w-16" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <Skeleton className="size-6" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="flex-1 space-y-4 px-2 py-2">
        <GroupSkeleton rows={TYPE_ROWS} />
        <GroupSkeleton rows={COLLECTION_ROWS} />
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t p-4">
        <Skeleton className="size-8 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}
