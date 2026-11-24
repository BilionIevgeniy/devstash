import { Skeleton } from "@/components/ui/skeleton";

import { CANCELLATION_KINDS } from "@/features/billing/domain/cancellation";

// What the § 312k page shows while it reads the session: the signed-out form,
// the common case of a visitor from a footer, at its heights (two fields, the
// kinds, the button), so the page keeps its length when the form arrives.
export function CancelContractFormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1].map((field) => (
        <div key={field} className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full max-md:h-11" />
        </div>
      ))}
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        {CANCELLATION_KINDS.map((kind) => (
          <Skeleton key={kind} className="h-5 w-56" />
        ))}
      </div>
      <Skeleton className="h-9 w-44 max-md:h-11" />
    </div>
  );
}
