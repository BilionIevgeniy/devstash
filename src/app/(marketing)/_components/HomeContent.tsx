import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TestModeHint } from "@/features/billing/components/TestModeHint";
import { homePath, LOCALES, type Locale } from "@/i18n/config";
import { getAppOrigin } from "@/lib/app-url";
import { isStripeTestMode } from "@/lib/stripe";

import { AISection } from "./AISection";
import { CTASection } from "./CTASection";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { PricingSection } from "./PricingSection";

// The homepage of `/` and `/de`: the same sections in the locale the page
// passes, never one read from the request (ADR 0024).
export function HomeContent({ locale }: { locale: Locale }) {
  return (
    <main>
      <HeroSection locale={locale} />
      <FeaturesSection locale={locale} />
      <AISection locale={locale} />
      <PricingSection note={isStripeTestMode() ? <TestModeHint /> : null} />
      <CTASection locale={locale} />
    </main>
  );
}

// The title and description of a homepage, and the other language's URL for
// search engines (hreflang), with English as the default. The links are
// absolute on the configured origin: without a metadataBase Next would write
// them on localhost. APP_URL is read at build time, so the page stays static.
export async function homeMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    metadataBase: new URL(getAppOrigin()),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: homePath(locale),
      languages: {
        ...Object.fromEntries(LOCALES.map((code) => [code, homePath(code)])),
        "x-default": homePath("en"),
      },
    },
  };
}
