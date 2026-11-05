import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CheckList } from "./CheckList";
import { GradientBadge } from "./GradientBadge";

interface PricingCardProps {
  name: string;
  price: string;
  note: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export function PricingCard({
  name,
  price,
  note,
  features,
  cta,
  highlighted = false,
}: PricingCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[14px] border bg-card p-8",
        highlighted &&
          "border-brand/50 shadow-[0_0_60px_-20px_rgba(139,92,246,0.4)]",
      )}
    >
      {highlighted && (
        <GradientBadge className="absolute -top-3.25 left-1/2 -translate-x-1/2 whitespace-nowrap">
          Most Popular
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
          <span>/month</span>
        </p>
        <p className="mt-1 min-h-6 text-[13px] text-dim">{note}</p>
      </div>
      <CheckList items={features} className="mt-6 mb-8" />
      <Button
        asChild
        variant={highlighted ? "default" : "outline"}
        size="lg"
        className="mt-auto h-11 w-full px-5 text-[15px]"
      >
        <Link href="/register">{cta}</Link>
      </Button>
    </article>
  );
}
