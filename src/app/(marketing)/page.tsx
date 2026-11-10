import type { Metadata } from "next";

import { AISection } from "./_components/AISection";
import { CTASection } from "./_components/CTASection";
import { FeaturesSection } from "./_components/FeaturesSection";
import { HeroSection } from "./_components/HeroSection";
import { PricingSection } from "./_components/PricingSection";
import { TestModeHint } from "@/features/billing/components/TestModeHint";
import { isStripeTestMode } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "DevStash - Store Smarter. Build Faster.",
  description:
    "One fast, searchable hub for your code snippets, AI prompts, commands, notes, files, images and links.",
};

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <AISection />
      <PricingSection note={isStripeTestMode() ? <TestModeHint /> : null} />
      <CTASection />
    </main>
  );
}
