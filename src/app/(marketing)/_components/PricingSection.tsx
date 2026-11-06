"use client";

import Link from "next/link";
import { useState } from "react";

import { BillingToggle } from "@/features/billing/components/BillingToggle";
import { PricingCard } from "@/features/billing/components/PricingCard";
import { PricingCardButton } from "@/features/billing/components/PricingCardButton";
import { PricingGrid } from "@/features/billing/components/PricingGrid";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  proPriceDisplay,
} from "@/features/billing/domain/limits";

import { ScrollFadeIn } from "./ScrollFadeIn";
import { SectionHead } from "./SectionHead";

const PRO_FEATURES = [
  ...PRO_PLAN_FEATURES,
  "Custom item types",
  "AI features",
  "Export (JSON / ZIP)",
];

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="marketing-section scroll-mt-20">
      <div className="marketing-container">
        <SectionHead
          title="Simple, Transparent Pricing"
          lead="Start free. Upgrade when you need more power."
        />
        <PricingGrid
          toggle={
            <ScrollFadeIn>
              <BillingToggle yearly={isYearly} onChange={setIsYearly} />
            </ScrollFadeIn>
          }
          free={
            <ScrollFadeIn className="h-full">
              <PricingCard
                name="Free"
                price="$0"
                note="Free forever"
                features={FREE_PLAN_FEATURES}
                action={
                  <PricingCardButton asChild variant="outline">
                    <Link href="/register">Get Started</Link>
                  </PricingCardButton>
                }
              />
            </ScrollFadeIn>
          }
          pro={
            <ScrollFadeIn className="h-full">
              <PricingCard
                name="Pro"
                {...proPriceDisplay(isYearly)}
                features={PRO_FEATURES}
                highlighted
                action={
                  <PricingCardButton asChild>
                    <Link href="/register">Go Pro</Link>
                  </PricingCardButton>
                }
              />
            </ScrollFadeIn>
          }
        />
      </div>
    </section>
  );
}
