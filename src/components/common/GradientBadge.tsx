import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GradientBadgeProps {
  children: ReactNode;
  className?: string;
}

export function GradientBadge({ children, className }: GradientBadgeProps) {
  return (
    <span
      className={cn(
        "gradient-fill inline-block rounded-full px-3 py-1 text-xs leading-[1.4] font-semibold text-background",
        className,
      )}
    >
      {children}
    </span>
  );
}
