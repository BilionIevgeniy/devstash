import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The button of a PricingCard: a link on the homepage, Checkout on /upgrade.
export function PricingCardButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      size="lg"
      className={cn("h-11 w-full px-5 text-[15px]", className)}
      {...props}
    />
  );
}
