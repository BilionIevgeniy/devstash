import Link from "next/link";
import type { ReactNode } from "react";

import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { LOCKED_LABEL } from "@/features/items/domain/item-fields";
import { cn } from "@/lib/utils";

interface LockedItemRowProps {
  title: string;
  children: ReactNode;
  /** The layout of the row's trigger, which this takes the place of. */
  className?: string;
}

// A row is too low for text over it, so the reason goes to the accessible name.
// A link, as the row keyboard focus looks for one. Its delete button is in the
// row's own controls, beside this.
export function LockedItemRow({
  title,
  children,
  className,
}: LockedItemRowProps) {
  return (
    <Link
      href={UPGRADE_PATH}
      aria-label={`${title}: ${LOCKED_LABEL.toLowerCase()}`}
      title={LOCKED_LABEL}
      className={cn(
        "rounded-lg opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </Link>
  );
}
