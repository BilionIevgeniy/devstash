import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTextProps {
  /** The text the bar stands for: unseen, it gives the bar its size. */
  children: ReactNode;
  className?: string;
}

// A bar as large as the text it stands for, so it wraps where the text will,
// in either language and at any width: for a text that is known before the
// answer, or a typical one of its length. A constant height is for what
// depends on the data.
export function SkeletonText({ children, className }: SkeletonTextProps) {
  return (
    <Skeleton aria-hidden className={cn("w-fit max-w-full", className)}>
      <span className="invisible">{children}</span>
    </Skeleton>
  );
}
