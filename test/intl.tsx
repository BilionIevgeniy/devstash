import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { JSXElementConstructor, ReactElement, ReactNode } from "react";

import { I18nProvider } from "@/components/common/I18nProvider";
import { createQueryClient } from "@/components/common/query-client";
import type { Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";

// Testing Library with the messages of the app around every render, as the
// layouts put them there (ADR 0024). A test imports render and renderHook from
// here instead of "@testing-library/react"; the rest is re-exported as is.
// English unless a test asks for `locale: "de"`. A wrapper the test passes
// sits inside the messages, so it can use them too. A fresh Query client with
// the app's defaults sits inside the messages as well (the (app) layout nests
// them that way, ADR 0025); a test that reads or fills the cache passes its
// own `queryClient`.

export * from "@testing-library/react";

type Wrapper = JSXElementConstructor<{ children: ReactNode }>;

interface IntlOptions {
  locale?: Locale;
  queryClient?: QueryClient;
}

function withIntl(
  { locale = "en", queryClient = createQueryClient() }: IntlOptions,
  Inner?: Wrapper,
): Wrapper {
  return function IntlWrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider locale={locale} messages={messagesFor(locale)}>
        <QueryClientProvider client={queryClient}>
          {Inner ? <Inner>{children}</Inner> : children}
        </QueryClientProvider>
      </I18nProvider>
    );
  };
}

export function render(
  ui: ReactElement,
  {
    locale,
    queryClient,
    wrapper,
    ...options
  }: RenderOptions & IntlOptions = {},
) {
  return rtlRender(ui, {
    ...options,
    wrapper: withIntl({ locale, queryClient }, wrapper),
  });
}

export function renderHook<Result, Props>(
  hook: (props: Props) => Result,
  {
    locale,
    queryClient,
    wrapper,
    ...options
  }: RenderHookOptions<Props> & IntlOptions = {},
) {
  return rtlRenderHook(hook, {
    ...options,
    wrapper: withIntl({ locale, queryClient }, wrapper),
  });
}
