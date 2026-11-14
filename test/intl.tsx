import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react";
import type { JSXElementConstructor, ReactElement, ReactNode } from "react";

import { I18nProvider } from "@/components/common/I18nProvider";
import type { Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";

// Testing Library with the messages of the app around every render, as the
// layouts put them there (ADR 0024). A test imports render and renderHook from
// here instead of "@testing-library/react"; the rest is re-exported as is.
// English unless a test asks for `locale: "de"`. A wrapper the test passes
// sits inside the messages, so it can use them too.

export * from "@testing-library/react";

type Wrapper = JSXElementConstructor<{ children: ReactNode }>;

interface IntlOptions {
  locale?: Locale;
}

function withIntl(locale: Locale = "en", Inner?: Wrapper): Wrapper {
  return function IntlWrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider locale={locale} messages={messagesFor(locale)}>
        {Inner ? <Inner>{children}</Inner> : children}
      </I18nProvider>
    );
  };
}

export function render(
  ui: ReactElement,
  { locale, wrapper, ...options }: RenderOptions & IntlOptions = {},
) {
  return rtlRender(ui, { ...options, wrapper: withIntl(locale, wrapper) });
}

export function renderHook<Result, Props>(
  hook: (props: Props) => Result,
  { locale, wrapper, ...options }: RenderHookOptions<Props> & IntlOptions = {},
) {
  return rtlRenderHook(hook, {
    ...options,
    wrapper: withIntl(locale, wrapper),
  });
}
