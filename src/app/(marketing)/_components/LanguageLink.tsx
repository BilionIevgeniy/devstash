import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { homePath, otherLocale } from "@/i18n/config";

interface LanguageLinkProps {
  /** "code" shows "DE" with the full name for screen readers; "name" shows "Deutsch". */
  variant: "code" | "name";
  className?: string;
}

// The homepage in the other language, written in that language. A client
// component of the navbar: the locale comes from its provider.
export function LanguageLink({ variant, className }: LanguageLinkProps) {
  const t = useTranslations("marketing.language");
  const other = otherLocale(useLocale());

  return (
    <Link
      href={homePath(other)}
      hrefLang={other}
      lang={other}
      aria-label={variant === "code" ? t("otherLabel") : undefined}
      className={className}
    >
      {variant === "code" ? other.toUpperCase() : t("other")}
    </Link>
  );
}
