import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { I18nProvider } from "@/components/common/I18nProvider";
import { messagesFor } from "@/i18n/messages";

// The description of every page under this layout, in its language; the
// title stays the root layout's "DevStash".
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.meta");
  return { description: t("description") };
}

// The sign-in, registration and email-link pages, in the locale of the request:
// the cookie the user chose, else the browser's language (ADR 0024). Reading it
// makes these pages dynamic. The wrapper keeps the body's column, so AuthCard's
// `flex-1` still centres the card.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <I18nProvider locale={locale} messages={messagesFor(locale)}>
      <div lang={locale} className="flex flex-1 flex-col">
        {children}
      </div>
    </I18nProvider>
  );
}
