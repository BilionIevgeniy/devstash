import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/common/Logo";
import { homePath, otherLocale, type Locale } from "@/i18n/config";
import { IMPRINT_PATH, PRIVACY_PATH } from "@/lib/legal-paths";

interface FooterEntry {
  label: string;
  href: string;
}

const FOOTER_LINK = "transition-colors hover:text-foreground";

// Only pages that exist. A link is added here in the commit that adds its page.
// The in-page links lead to the homepage of the footer's own language.
export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const home = homePath(locale);
  const other = otherLocale(locale);
  const columns: { heading: string; entries: FooterEntry[] }[] = [
    {
      heading: t("footer.product"),
      entries: [
        { label: t("nav.features"), href: `${home}#features` },
        { label: t("nav.pricing"), href: `${home}#pricing` },
      ],
    },
    {
      heading: t("footer.legal"),
      entries: [
        { label: t("footer.privacy"), href: PRIVACY_PATH },
        { label: t("footer.imprint"), href: IMPRINT_PATH },
      ],
    },
  ];

  return (
    <footer className="border-t pt-16 pb-8">
      <div className="marketing-container">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>
          {columns.map(({ heading, entries }) => (
            <nav key={heading} aria-label={heading}>
              <h3 className="font-mono text-[13px] font-medium">{heading}</h3>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {entries.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className={FOOTER_LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-label={t("language.label")}>
            <h3 className="font-mono text-[13px] font-medium">
              {t("language.label")}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              <Link
                href={homePath(other)}
                hrefLang={other}
                lang={other}
                className={FOOTER_LINK}
              >
                {t("language.other")}
              </Link>
            </p>
          </nav>
        </div>
        <p className="mt-12 border-t pt-6 text-[13px] text-dim">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
