"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

// A client component: a server one would read the locale of the request and
// turn the static homepage dynamic (ADR 0024).
export function TestModeHint({ className }: { className?: string }) {
  const t = useTranslations("billing");
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t("testModeHint")}
    </p>
  );
}
