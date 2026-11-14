"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { BillingToggle } from "@/features/billing/components/BillingToggle";
import { PricingCard } from "@/features/billing/components/PricingCard";
import { PricingCardButton } from "@/features/billing/components/PricingCardButton";
import { PricingGrid } from "@/features/billing/components/PricingGrid";
import { usePlanText } from "@/features/billing/components/hooks/use-plan-text";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PRO_ROADMAP_FEATURES,
} from "@/features/billing/domain/limits";

import { ScrollFadeIn } from "./ScrollFadeIn";
import { SectionHead } from "./SectionHead";

// The roadmap lines on top of what Pro gives today: custom item types are not
// built yet (context/todo.md), and the export is JSON only.
const PRO_FEATURES = [...PRO_PLAN_FEATURES, ...PRO_ROADMAP_FEATURES];

interface PricingSectionProps {
  /** A line under the cards, rendered by the page: it needs the server. */
  note?: ReactNode;
}

export function PricingSection({ note }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const t = useTranslations("marketing.pricing");
  const plan = usePlanText();

  return (
    <section id="pricing" className="marketing-section scroll-mt-20">
      <div className="marketing-container">
        <SectionHead title={t("title")} lead={t("lead")} />
        <PricingGrid
          toggle={
            <ScrollFadeIn>
              <BillingToggle yearly={isYearly} onChange={setIsYearly} />
            </ScrollFadeIn>
          }
          free={
            <ScrollFadeIn className="h-full">
              <PricingCard
                {...plan.free}
                features={plan.features(FREE_PLAN_FEATURES)}
                action={
                  <PricingCardButton asChild variant="outline">
                    <Link href="/register">{plan.t("plans.getStarted")}</Link>
                  </PricingCardButton>
                }
              />
            </ScrollFadeIn>
          }
          pro={
            <ScrollFadeIn className="h-full">
              <PricingCard
                {...plan.pro(isYearly)}
                features={plan.features(PRO_FEATURES)}
                highlighted
                action={
                  <PricingCardButton asChild>
                    <Link href="/register">{plan.t("plans.goPro")}</Link>
                  </PricingCardButton>
                }
              />
            </ScrollFadeIn>
          }
        />
        {note && (
          <div className="mx-auto mt-8 max-w-xl text-center">{note}</div>
        )}
      </div>
    </section>
  );
}
