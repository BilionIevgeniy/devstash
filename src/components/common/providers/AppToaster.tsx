"use client";

import { useTranslations } from "next-intl";

import { useResolvedTheme } from "@/components/common/hooks/use-theme";
import { Toaster } from "@/components/ui/sonner";

// The toast region of a provider layout ((app), (auth) and MarketingFrame),
// inside its messages, so the region's label is in the page's language. Never
// in the root layout, which reads no locale and keeps the static pages static
// (ADR 0024). The Storybook decorator renders it too, so a story's toast sits
// and looks as in the app. A toast fired just before a move into another of
// these layouts goes with the old region: the password change passes its
// confirmation to the sign-in page in the URL instead. The toasts follow the
// visitor's theme (ADR 0039); dark until hydration is over, when no toast has
// been shown yet.
export function AppToaster() {
  const t = useTranslations("common");
  const theme = useResolvedTheme() ?? "dark";
  return (
    <Toaster
      theme={theme}
      position="top-center"
      richColors
      containerAriaLabel={t("notifications")}
    />
  );
}
