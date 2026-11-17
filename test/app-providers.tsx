import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { I18nProvider } from "@/components/common/I18nProvider";
import type { Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";

interface AppProvidersProps {
  locale: Locale;
  /**
   * Made once by the caller (a test wrapper, a story's mount), never here: a
   * default in this component would build a new client, an empty cache, on
   * every render.
   */
  queryClient: QueryClient;
  children: ReactNode;
}

// The providers the layouts put around client components, nested as the (app)
// layout nests them (ADR 0024, ADR 0025): the messages of the locale, and the
// Query client inside them. Shared by the test wrapper (test/intl.tsx) and the
// Storybook decorator (.storybook/preview.tsx), so a test and a story render
// with the same context.
export function AppProviders({
  locale,
  queryClient,
  children,
}: AppProvidersProps) {
  return (
    <I18nProvider locale={locale} messages={messagesFor(locale)}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
}
