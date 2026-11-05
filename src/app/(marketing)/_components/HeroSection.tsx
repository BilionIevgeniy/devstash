import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { ChaosAnimation } from "./ChaosAnimation";
import { DashboardPreview } from "./DashboardPreview";

const PANEL_LABEL =
  "mb-3 font-mono text-[13px] leading-[1.4] font-medium text-dim";

export function HeroSection() {
  return (
    <section className="pt-32">
      <div className="marketing-container">
        <div className="mx-auto max-w-190 text-center">
          <h1 className="text-[clamp(2rem,1rem+4.5vw,4rem)] leading-[1.05] font-bold tracking-[-0.035em]">
            Stop Losing Your
            <span className="gradient-text block">Developer Knowledge</span>
          </h1>
          <p className="marketing-lead mt-6">
            Your snippets, prompts, commands, and notes are scattered across
            Notion, GitHub, Slack, and a dozen browser tabs. DevStash brings
            them all into one fast, searchable hub.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-5 text-[15px]">
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-5 text-[15px]"
            >
              <a href="#features">See Features</a>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:mt-16 md:grid-cols-[minmax(0,5fr)_72px_minmax(0,7fr)]">
          <figure className="min-w-0">
            <figcaption className={PANEL_LABEL}>
              Your knowledge today...
            </figcaption>
            <ChaosAnimation />
          </figure>

          {/* The wrapper owns the rotation, the icon owns the pulse: an
              animation on one element would override its rotation. */}
          <div
            aria-hidden="true"
            className="flex h-14 rotate-90 items-center justify-center text-brand md:h-100 md:rotate-0 md:self-end"
          >
            <ArrowRight className="size-7 motion-safe:animate-arrow-pulse" />
          </div>

          <figure className="min-w-0">
            <figcaption className={PANEL_LABEL}>...with DevStash</figcaption>
            <DashboardPreview />
          </figure>
        </div>
      </div>
    </section>
  );
}
