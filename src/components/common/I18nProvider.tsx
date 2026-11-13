"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import type { ReactNode } from "react";

import { DEFAULT_TIME_ZONE, FORMATS, type Locale } from "@/i18n/config";
import { messageFallback } from "@/i18n/fallback";

interface I18nProviderProps {
  locale: Locale;
  messages: AbstractIntlMessages;
  children: ReactNode;
}

function ignore(): void {}

// The messages of a subtree for its client components, with the same time
// zone, formats and fallback as the server (ADR 0024). A client component
// because functions cannot cross from a server layout. It renders no element:
// `lang` goes on an element the layout already has.
export function I18nProvider({
  locale,
  messages,
  children,
}: I18nProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={DEFAULT_TIME_ZONE}
      formats={FORMATS}
      onError={ignore}
      getMessageFallback={messageFallback(locale)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
