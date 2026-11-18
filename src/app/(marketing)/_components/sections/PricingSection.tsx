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

import { DASHBOARD_PATH } from "@/features/auth/domain/auth-paths";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";

import { BUTTON_TRANSITION, SessionAwareAction } from "../SessionAwareAction";
import { ScrollFadeIn } from "./ScrollFadeIn";
import { SectionHead } from "./SectionHead";

// A hidden variant is not prefetched (SessionAwareAction).
const prefetch = (hidden: boolean) => (hidden ? false : undefined);

interface PlanActionProps {
  variant?: "outline";
  label: string;
  /** Where a signed-in visitor goes instead of the registration. */
  memberHref: string;
  memberLabel: string;
}

// The button of a plan card: register for a guest, the plan's page in the app
// for a signed-in visitor.
function PlanAction({
  variant,
  label,
  memberHref,
  memberLabel,
}: PlanActionProps) {
  return (
    <SessionAwareAction
      guest={(hidden) => (
        <PricingCardButton
          asChild
          variant={variant}
          className={BUTTON_TRANSITION}
        >
          <Link href="/register" prefetch={prefetch(hidden)}>
            {label}
          </Link>
        </PricingCardButton>
      )}
      member={(hidden) => (
        <PricingCardButton
          asChild
          variant={variant}
          className={BUTTON_TRANSITION}
        >
          <Link href={memberHref} prefetch={prefetch(hidden)}>
            {memberLabel}
          </Link>
        </PricingCardButton>
      )}
    />
  );
}

// The roadmap line on top of what Pro gives today: the export is JSON only.
const PRO_FEATURES = [...PRO_PLAN_FEATURES, ...PRO_ROADMAP_FEATURES];

interface PricingSectionProps {
  /** A line under the cards, rendered by the page: it needs the server. */
  note?: ReactNode;
}

export function PricingSection({ note }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const t = useTranslations("marketing.pricing");
  const marketing = useTranslations("marketing");
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
                  <PlanAction
                    variant="outline"
                    label={plan.t("plans.getStarted")}
                    memberHref={DASHBOARD_PATH}
                    memberLabel={marketing("openDashboard")}
                  />
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
                  <PlanAction
                    label={plan.t("plans.goPro")}
                    memberHref={UPGRADE_PATH}
                    memberLabel={plan.t("plans.goPro")}
                  />
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
