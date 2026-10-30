import { Skeleton } from "@/components/ui/skeleton";

export default function ItemLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-lg border bg-card p-6">
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
