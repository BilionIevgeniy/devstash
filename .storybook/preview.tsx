import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { sb } from "storybook/test";

import { geistMono, geistSans } from "@/app/fonts";
import { setTheme } from "@/components/common/hooks/use-theme";
import { AppToaster } from "@/components/common/providers/AppToaster";
import { ThemeSync } from "@/components/common/theme/ThemeSync";
import { createQueryClient } from "@/components/common/providers/query-client";
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/i18n/config";
import type { ResolvedTheme } from "@/lib/theme";

import { AppProviders } from "../test/app-providers";

import "../src/app/globals.css";

// Server Actions a story reaches, each replaced by the mock file next to it
// (__mocks__/), never automocked: an automock still evaluates the module and
// its server imports (ADR 0026). A string with the extension: Storybook
// resolves it with require.resolve, and `import("….ts")` would need
// allowImportingTsExtensions in tsconfig.json.
sb.mock("../src/features/collections/actions/collection.ts");
sb.mock("../src/features/item-types/actions/custom-type.ts");

// The theme and the fonts go on <html>, as in src/app/layout.tsx: the dark
// variant matches `.dark *` and `html` reads the font variables, so a menu, a
// sheet or a toast that portals into <body> is dark too, and the a11y check
// measures the colours the app shows. `dark` is the start; the toolbar's
// theme moves it through the app's own store and ThemeSync (ADR 0039).
document.documentElement.classList.add(
  "dark",
  geistSans.variable,
  geistMono.variable,
  "antialiased",
);

// One Query client per story mount, never a module singleton, so no cache
// carries over from one story test to the next (as in QueryProvider, which is
// not used here: its devtools button would join every a11y scan).
// The theme is set in a layout effect, never during render: the store tells
// its subscribers (the toaster), and it writes the browser's storage.
function StoryProviders({
  locale,
  theme,
  children,
}: {
  locale: Locale;
  theme: ResolvedTheme;
  children: ReactNode;
}) {
  const [queryClient] = useState(createQueryClient);
  useLayoutEffect(() => {
    setTheme(theme);
  }, [theme]);
  return (
    <AppProviders locale={locale} queryClient={queryClient}>
      {children}
      <AppToaster />
      <ThemeSync />
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
  const theme: ResolvedTheme =
    context.globals.theme === "light" ? "light" : "dark";
  return (
    <StoryProviders locale={locale} theme={theme}>
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
    theme: {
      description: "Colour theme",
      toolbar: { icon: "mirror", items: ["dark", "light"], dynamicTitle: true },
    },
  },
  // Dark, as a visitor who never chose sees the app. CI runs the stories in
  // dark only; a story that must be checked in light says so (`globals`).
  initialGlobals: { locale: DEFAULT_LOCALE, theme: "dark" },
  parameters: {
    // Every route is in app/, so next/navigation is the App Router's.
    nextjs: { appDirectory: true },
    // An axe violation fails the story's test, not only the panel.
    a11y: { test: "error" },
    controls: { expanded: true },
  },
};

export default preview;
