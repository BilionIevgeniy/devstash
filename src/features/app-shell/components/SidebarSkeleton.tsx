import { Skeleton } from "@/components/ui/skeleton";

const TYPE_ROWS = 7;
// The real Collections and Items run from nothing to two full groups. Only the
// common case is mirrored, one group; Types has a fixed height and matches.
const COLLECTION_ROWS = 5;
const ITEM_ROWS = 4;

interface SectionSkeletonProps {
  rows: number;
  hasLabel?: boolean;
}

// The same heights as the real parts: a 28px header, a 20px group label and
// 32px rows that touch; on a phone the header and the rows are 44px, the touch
// target of the real links.
function SectionSkeleton({ rows, hasLabel = false }: SectionSkeletonProps) {
  return (
    <div>
      <div className="flex h-7 items-center px-2 max-md:h-11">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-1">
        {hasLabel && (
          <div className="px-2 pb-1">
            <Skeleton className="h-4 w-16" />
          </div>
        )}
        <div>
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex h-8 items-center max-md:h-11">
              <Skeleton className="h-6 w-full max-md:h-9" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <div className="flex items-center gap-2 max-md:min-h-11">
          <Skeleton className="size-6" />
          <div className="flex h-7 items-center">
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-hidden p-2">
        <SectionSkeleton rows={TYPE_ROWS} />
        <SectionSkeleton rows={COLLECTION_ROWS} hasLabel />
        <SectionSkeleton rows={ITEM_ROWS} hasLabel />
      </div>

      <div className="shrink-0 border-t p-2">
        <div className="flex items-center gap-3 p-2">
          <Skeleton className="size-8 rounded-full" />
          <div>
            <div className="flex h-5 items-center">
              <Skeleton className="h-3.5 w-24" />
            </div>
            <div className="flex h-4 items-center">
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="ml-auto size-4" />
        </div>
      </div>
    </div>
  );
}
