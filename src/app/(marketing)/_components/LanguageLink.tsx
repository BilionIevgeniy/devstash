"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { LinkPendingMark } from "@/components/common/LinkPendingMark";
import { homePath, otherLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

import { rememberLocale } from "./remember-locale";

interface LanguageLinkProps {
  /** "code" shows "DE" with the full name for screen readers; "name" shows "Deutsch". */
  variant: "code" | "name";
  className?: string;
}

// The homepage in the other language, written in that language, for the
// navbar and the footer. A client component: the locale comes from the
// provider of MarketingFrame, so the static footer reads no request.
// From the homepage the other one opens at the same scroll position (the same
// sections in the same order); from a legal page it opens at the top. The
// click also remembers the choice for the auth pages and the app.
export function LanguageLink({ variant, className }: LanguageLinkProps) {
  const t = useTranslations("marketing.language");
  const locale = useLocale();
  const other = otherLocale(locale);
  const onHomepage = usePathname() === homePath(locale);

  return (
    <Link
      href={homePath(other)}
      scroll={!onHomepage}
      hrefLang={other}
      lang={other}
      aria-label={variant === "code" ? t("otherLabel") : undefined}
      onClick={() => rememberLocale(other)}
      className={cn(
        "group/lang group-has-data-pending/lang:opacity-60",
        className,
      )}
    >
      {variant === "code" ? other.toUpperCase() : t("other")}
      <LinkPendingMark />
    </Link>
  );
}
