import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CheckList } from "@/components/common/CheckList";
import { GradientBadge } from "@/components/common/GradientBadge";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  price: string;
  note: string;
  features: string[];
  /** The button at the foot of the card, a PricingCardButton. */
  action: ReactNode;
  highlighted?: boolean;
}

// The text size is set here and not by the page: the homepage and the upgrade
// page sit on different roots, and the two must look the same.
export function PricingCard({
  name,
  price,
  note,
  features,
  action,
  highlighted = false,
}: PricingCardProps) {
  const t = useTranslations("billing.plans");

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[14px] border bg-card p-8 text-[15px] leading-[1.6]",
        highlighted &&
          "border-brand/50 shadow-[0_0_60px_-20px_rgba(139,92,246,0.4)]",
      )}
    >
      {highlighted && (
        <GradientBadge className="absolute -top-3.25 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {t("mostPopular")}
        </GradientBadge>
      )}
      <h3 className="text-lg leading-[1.35] font-semibold tracking-[-0.01em]">
        {name}
      </h3>
      {/* The key restarts the fade when the billing period changes. */}
      <div
        key={price}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
      >
        <p className="mt-4 text-muted-foreground">
          <span className="mr-1 inline-block text-5xl leading-[1.1] font-bold tracking-[-0.03em] text-foreground tabular-nums">
            {price}
          </span>
          <span>{t("perMonth")}</span>
        </p>
        <p className="mt-1 min-h-6 text-[13px] text-dim">{note}</p>
      </div>
      <CheckList items={features} className="mt-6 mb-8" />
      <div className="mt-auto">{action}</div>
    </article>
  );
}
