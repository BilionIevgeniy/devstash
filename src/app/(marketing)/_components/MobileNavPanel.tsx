import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { homePath } from "@/i18n/config";

import { LanguageLink } from "./LanguageLink";

const PANEL_LINK = "flex min-h-11 items-center text-muted-foreground";

interface MobileNavPanelProps {
  id: string;
  signedIn: boolean;
  onClose: () => void;
}

export function MobileNavPanel({ id, signedIn, onClose }: MobileNavPanelProps) {
  const t = useTranslations("marketing");
  const home = homePath(useLocale());

  return (
    <nav id={id} aria-label={t("nav.mobile")} className="border-t md:hidden">
      <div className="marketing-container flex flex-col py-2 text-sm">
        <Link
          href={`${home}#features`}
          className={PANEL_LINK}
          onClick={onClose}
        >
          {t("nav.features")}
        </Link>
        <Link href={`${home}#pricing`} className={PANEL_LINK} onClick={onClose}>
          {t("nav.pricing")}
        </Link>
        {!signedIn && (
          <Link href="/sign-in" className={PANEL_LINK}>
            {t("nav.signIn")}
          </Link>
        )}
        <LanguageLink variant="name" className={PANEL_LINK} />
      </div>
    </nav>
  );
}
