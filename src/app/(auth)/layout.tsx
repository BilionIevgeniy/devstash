import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ConsentRoot } from "@/components/common/consent/ConsentRoot";
import { PrivacySettingsButton } from "@/components/common/consent/PrivacySettingsButton";
import { AppToaster } from "@/components/common/providers/AppToaster";
import { I18nProvider } from "@/components/common/providers/I18nProvider";
import { FreshAuthDocument } from "@/features/auth/components/FreshAuthDocument";
import { messagesFor } from "@/i18n/messages";

// The description of every page under this layout, in its language; the
// title stays the root layout's "DevStash". Never indexed (a reset link
// carries a token): the same rule goes out as the X-Robots-Tag header
// (next.config.ts), since this dynamic layout's metadata streams into the body.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.meta");
  return {
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

// Reads the locale of the request at its top, so the segment blocks on the
// server, as it did before Cache Components (ADR 0037).
export const instant = false;

// The sign-in, registration and email-link pages, in the locale of the request:
// the cookie the user chose, else the browser's language (ADR 0024). Reading it
// makes these pages dynamic. The wrapper keeps the body's column, so AuthCard's
// `flex-1` still centres the card.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <I18nProvider locale={locale} messages={messagesFor(locale)}>
      <div lang={locale} className="flex flex-1 flex-col pb-(--consent-inset)">
        {children}
        {/* Withdrawing consent is as easy here as on every other page. */}
        <footer className="flex justify-center pb-6 text-xs text-muted-foreground">
          <PrivacySettingsButton className="inline-flex items-center underline-offset-4 hover:text-foreground hover:underline max-md:min-h-11" />
        </footer>
      </div>
      <AppToaster />
      <ConsentRoot />
      <FreshAuthDocument />
    </I18nProvider>
  );
}
