import type { ComponentProps, ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonButtonProps {
  /** The button's icon and label: unseen, they give the bar its size. */
  children: ReactNode;
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}

// A bar of a button's size, for a button that is known before the answer but
// cannot be used yet. Not a control.
export function SkeletonButton({
  children,
  size,
  className,
}: SkeletonButtonProps) {
  return (
    <Skeleton
      aria-hidden
      className={cn(
        buttonVariants({ size }),
        "pointer-events-none bg-muted",
        className,
      )}
    >
      <span className="invisible contents">{children}</span>
    </Skeleton>
  );
}
