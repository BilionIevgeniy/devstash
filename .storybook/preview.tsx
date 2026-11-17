import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { useState, type ReactNode } from "react";
import { sb } from "storybook/test";

import { geistMono, geistSans } from "@/app/fonts";
import { AppToaster } from "@/components/common/providers/AppToaster";
import { createQueryClient } from "@/components/common/providers/query-client";
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/i18n/config";

import { AppProviders } from "../test/app-providers";

import "../src/app/globals.css";

// Server Actions a story reaches, each replaced by the mock file next to it
// (__mocks__/), never automocked: an automock still evaluates the module and
// its server imports (ADR 0026). A string with the extension: Storybook
// resolves it with require.resolve, and `import("….ts")` would need
// allowImportingTsExtensions in tsconfig.json.
sb.mock("../src/features/collections/actions/collection.ts");

// The theme and the fonts go on <html>, as in src/app/layout.tsx: the dark
// variant matches `.dark *` and `html` reads the font variables, so a menu, a
// sheet or a toast that portals into <body> is dark too, and the a11y check
// measures the colours the app shows.
document.documentElement.classList.add(
  "dark",
  geistSans.variable,
  geistMono.variable,
  "antialiased",
);

// One Query client per story mount, never a module singleton, so no cache
// carries over from one story test to the next (as in QueryProvider, which is
// not used here: its devtools button would join every a11y scan).
function StoryProviders({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [queryClient] = useState(createQueryClient);
  return (
    <AppProviders locale={locale} queryClient={queryClient}>
      {children}
      <AppToaster />
    </AppProviders>
  );
}

const withAppProviders: Decorator = (Story, context) => {
  const locale = isLocale(context.globals.locale)
    ? context.globals.locale
    : DEFAULT_LOCALE;
  // German stories are announced as German (WCAG 3.1.1), like the pages that
  // set `lang` for their locale.
  document.documentElement.lang = locale;
  return (
    <StoryProviders locale={locale}>
      <Story />
    </StoryProviders>
  );
};

const preview: Preview = {
  decorators: [withAppProviders],
  globalTypes: {
    locale: {
      description: "Language of the messages",
      toolbar: { icon: "globe", items: [...LOCALES], dynamicTitle: true },
    },
  },
  initialGlobals: { locale: DEFAULT_LOCALE },
  parameters: {
    // Every route is in app/, so next/navigation is the App Router's.
    nextjs: { appDirectory: true },
    // An axe violation fails the story's test, not only the panel.
    a11y: { test: "error" },
    controls: { expanded: true },
  },
};

export default preview;
