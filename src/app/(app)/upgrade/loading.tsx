import { Skeleton } from "@/components/ui/skeleton";
import { PricingGrid } from "@/features/billing/components/PricingGrid";

// The heights of the two cards: Free has one line more, and it wraps. Side by
// side they stretch to the same height, as the real cards do.
const FREE_CARD_HEIGHT = "h-110";
const PRO_CARD_HEIGHT = "h-95";

export default function UpgradeLoading() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-1 h-6 w-72 max-w-full" />
      </header>
      <PricingGrid
        toggle={<Skeleton className="mx-auto h-6 w-64" />}
        free={<Skeleton className={`${FREE_CARD_HEIGHT} rounded-[14px]`} />}
        pro={<Skeleton className={`${PRO_CARD_HEIGHT} rounded-[14px]`} />}
      />
    </div>
  );
}
