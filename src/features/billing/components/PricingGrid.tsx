import type { ReactNode } from "react";

interface PricingGridProps {
  toggle: ReactNode;
  free: ReactNode;
  pro: ReactNode;
}

// By the width of the container, not the window: on /upgrade the sidebar takes
// its share, and two columns need room for two cards as wide as the homepage's.
// The switch comes first in the DOM, so Tab reaches it before the cards. In one
// column the Free card moves above it: the switch changes only the Pro price,
// so it sits over the Pro card.
export function PricingGrid({ toggle, free, pro }: PricingGridProps) {
  return (
    <div className="@container">
      <div className="grid grid-cols-[minmax(0,400px)] justify-center gap-8 @min-[720px]:grid-cols-[repeat(2,minmax(0,400px))] @min-[720px]:gap-6">
        <div className="@min-[720px]:col-span-2 @min-[720px]:mb-4">
          {toggle}
        </div>
        <div className="order-first @min-[720px]:order-0">{free}</div>
        <div>{pro}</div>
      </div>
    </div>
  );
}
