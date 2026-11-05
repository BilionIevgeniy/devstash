import type { Metadata } from "next";

import { AISection } from "./_components/AISection";
import { CTASection } from "./_components/CTASection";
import { FeaturesSection } from "./_components/FeaturesSection";
import { Footer } from "./_components/Footer";
import { HeroSection } from "./_components/HeroSection";
import { Navbar } from "./_components/Navbar";
import { PricingSection } from "./_components/PricingSection";

export const metadata: Metadata = {
  title: "DevStash - Store Smarter. Build Faster.",
  description:
    "One fast, searchable hub for your code snippets, AI prompts, commands, notes, files, images and links.",
};

export default function HomePage() {
  return (
    <div className="text-[15px] leading-[1.6]">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AISection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
