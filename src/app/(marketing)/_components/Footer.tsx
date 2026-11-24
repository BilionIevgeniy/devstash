import Link from "next/link";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/common/Logo";
import { homePath, type Locale } from "@/i18n/config";
import {
  CANCEL_CONTRACTS_PATH,
  IMPRINT_PATH,
  PRIVACY_PATH,
  TERMS_PATH,
} from "@/lib/http/legal-paths";

import { PrivacySettingsButton } from "@/components/common/consent/PrivacySettingsButton";

import { LanguageLink } from "./LanguageLink";

interface FooterEntry {
  label: string;
  href: string;
  /** Set when the label is in another language than the page. */
  lang?: string;
}

// The year of the copyright line. The pages are prerendered (ensureStatic),
// so the clock is read in a cache scope and read again once a day: the page
// is regenerated in the background when the entry is stale (ADR 0037).
async function copyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const FOOTER_LINK =
  "inline-flex items-center transition-colors hover:text-foreground max-md:min-h-11";

interface FooterColumnProps {
  heading: string;
  entries: FooterEntry[];
  /** After the links: the button that opens the consent banner again. */
  withPrivacySettings?: boolean;
}

function FooterColumn({
  heading,
  entries,
  withPrivacySettings,
}: FooterColumnProps) {
  return (
    <nav aria-label={heading}>
      <h3 className="font-mono text-[13px] font-medium">{heading}</h3>
      <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
        {entries.map(({ label, href, lang }) => (
          <li key={label}>
            <Link
              href={href}
              lang={lang}
              className={FOOTER_LINK}
              prefetch={href === CANCEL_CONTRACTS_PATH ? false : null}
            >
              {label}
            </Link>
          </li>
        ))}
        {withPrivacySettings && (
          <li>
            <PrivacySettingsButton className={FOOTER_LINK} />
          </li>
        )}
      </ul>
    </nav>
  );
}

// Only pages that exist. A link is added here in the commit that adds its page.
// The in-page links lead to the homepage of the footer's own language.
export async function Footer({ locale }: { locale: Locale }) {
  const [t, year] = await Promise.all([
    getTranslations({ locale, namespace: "marketing" }),
    copyrightYear(),
  ]);
  const home = homePath(locale);
  const columns: FooterColumnProps[] = [
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
        { label: t("footer.terms"), href: TERMS_PATH },
        { label: t("footer.privacy"), href: PRIVACY_PATH },
        { label: t("footer.imprint"), href: IMPRINT_PATH },
        // § 312k BGB: on every page, in German whatever the page's language.
        {
          label: t("footer.cancelContracts"),
          href: CANCEL_CONTRACTS_PATH,
          lang: "de",
        },
      ],
      withPrivacySettings: true,
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
          {columns.map((column) => (
            <FooterColumn key={column.heading} {...column} />
          ))}
          <nav aria-label={t("language.label")}>
            <h3 className="font-mono text-[13px] font-medium">
              {t("language.label")}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              <LanguageLink variant="name" className={FOOTER_LINK} />
            </p>
          </nav>
        </div>
        <p className="mt-12 border-t pt-6 text-[13px] text-dim">
          {t("footer.rights", { year })}
        </p>
      </div>
    </footer>
  );
}
