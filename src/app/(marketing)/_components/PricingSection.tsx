"use client";

import { useState } from "react";

import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  proYearlyPricePerMonth,
} from "@/features/billing/domain/limits";

import { BillingToggle } from "./BillingToggle";
import { PricingCard } from "./PricingCard";
import { ScrollFadeIn } from "./ScrollFadeIn";
import { SectionHead } from "./SectionHead";

const FREE_FEATURES = [
  `${FREE_ITEM_LIMIT} items`,
  `${FREE_COLLECTION_LIMIT} collections`,
  "Snippets, prompts, commands, notes and links",
  "Basic search",
];

const PRO_FEATURES = [
  "Unlimited items",
  "Unlimited collections",
  "File and image uploads",
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
        <ScrollFadeIn className="mb-10">
          <BillingToggle yearly={isYearly} onChange={setIsYearly} />
        </ScrollFadeIn>
        <div className="grid grid-cols-[minmax(0,400px)] justify-center gap-8 md:grid-cols-[repeat(2,minmax(0,400px))] md:gap-6">
          <ScrollFadeIn className="h-full">
            <PricingCard
              name="Free"
              price="$0"
              note="Free forever"
              features={FREE_FEATURES}
              cta="Get Started"
            />
          </ScrollFadeIn>
          <ScrollFadeIn className="h-full">
            <PricingCard
              name="Pro"
              price={`$${isYearly ? proYearlyPricePerMonth() : PRO_MONTHLY_PRICE}`}
              note={
                isYearly ? `Billed $${PRO_YEARLY_PRICE}/yr` : "Billed monthly"
              }
              features={PRO_FEATURES}
              cta="Go Pro"
              highlighted
            />
          </ScrollFadeIn>
        </div>
      </div>
    </section>
  );
}
