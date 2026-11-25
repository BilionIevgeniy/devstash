import Link from "next/link";
import type { ReactNode } from "react";

import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LockedItemRowProps {
  children: ReactNode;
  /** The layout of the row's trigger, which this takes the place of. */
  className?: string;
}

// A row is too low for text over it, so the reason goes to the accessible name,
// after the text on screen (WCAG 2.5.3, Label in Name).
// A link, as the row keyboard focus looks for one. Its delete button is in the
// row's own controls, beside this.
export function LockedItemRow({ children, className }: LockedItemRowProps) {
  const t = useTranslations("items.locked");
  return (
    <Link
      href={UPGRADE_PATH}
      title={t("label")}
      className={cn(
        "rounded-lg opacity-75 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
      <span className="sr-only">{t("label")}</span>
    </Link>
  );
}
