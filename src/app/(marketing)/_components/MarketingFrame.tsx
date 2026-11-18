import type { ReactNode } from "react";

import { ConsentRoot } from "@/components/common/consent/ConsentRoot";
import { AppToaster } from "@/components/common/providers/AppToaster";
import { I18nProvider } from "@/components/common/providers/I18nProvider";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/messages";

import { Footer } from "./Footer";
import { MARKETING_NAMESPACES } from "./marketing-namespaces";
import { Navbar } from "./Navbar";
import { SkipLink } from "./SkipLink";

interface MarketingFrameProps {
  locale: Locale;
  children: ReactNode;
}

// The header and footer of the homepage in one language, for the `(en)` and
// `de` layouts. The locale is a constant of the layout, never read from the
// request, so the pages stay static (ADR 0024); the client components get only
// the namespaces the marketing pages show.
export function MarketingFrame({ locale, children }: MarketingFrameProps) {
  return (
    <I18nProvider
      locale={locale}
      messages={pickMessages(locale, MARKETING_NAMESPACES)}
    >
      <div
        lang={locale}
        className="pb-(--consent-inset) text-[15px] leading-[1.6]"
      >
        <SkipLink locale={locale} />
        <Navbar />
        {children}
        <Footer locale={locale} />
      </div>
      <AppToaster />
      <ConsentRoot />
    </I18nProvider>
  );
}
