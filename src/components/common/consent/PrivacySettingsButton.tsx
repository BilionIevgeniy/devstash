"use client";

import { useTranslations } from "next-intl";

import { reopenConsent } from "@/components/common/hooks/use-consent";
import { cn } from "@/lib/utils";

// Withdrawing is as easy as agreeing (ADR 0034): one click in the footer of
// every page opens the banner again with both answers. A button, not a link:
// it goes nowhere.
export function PrivacySettingsButton({ className }: { className?: string }) {
  const t = useTranslations("common.consent");
  return (
    <button
      type="button"
      onClick={(event) => reopenConsent(event.currentTarget)}
      className={cn("cursor-pointer text-left", className)}
    >
      {t("settings")}
    </button>
  );
}
