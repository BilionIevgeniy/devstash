"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

// A client component: in the static marketing footer a server one would read
// the locale of the request and make the page dynamic (ADR 0024).
export function Logo() {
  const t = useTranslations("common");

  return (
    <Link
      href="/"
      aria-label={t("logoHome")}
      className="inline-flex items-center gap-2.5 text-base font-semibold"
    >
      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-linear-135 from-[#3b82f6] to-[#8b5cf6] text-foreground">
        <Layers className="size-4" />
      </span>
      <span>DevStash</span>
    </Link>
  );
}
