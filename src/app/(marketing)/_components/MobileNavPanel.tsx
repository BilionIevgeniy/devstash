import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { LinkPendingMark } from "@/components/common/LinkPendingMark";
import { homePath } from "@/i18n/config";

import { cn } from "@/lib/utils";

import { LanguageLink } from "./links/LanguageLink";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

const PANEL_LINK = "flex min-h-11 items-center text-muted-foreground";

interface MobileNavPanelProps {
  id: string;
  /** Null until the answer comes. */
  hasSession: boolean | null;
  onClose: () => void;
}

// The row that depends on the session comes last: when the answer takes it
// away, nothing under it moves. Until then its place is kept, with no guess.
export function MobileNavPanel({
  id,
  hasSession,
  onClose,
}: MobileNavPanelProps) {
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
        <LanguageLink variant="name" className={PANEL_LINK} />
        {hasSession === false && (
          <Link
            href={SIGN_IN_PATH}
            className={cn(
              PANEL_LINK,
              "transition-opacity has-data-pending:opacity-60 has-data-pending:delay-100",
            )}
          >
            {t("nav.signIn")}
            <LinkPendingMark />
          </Link>
        )}
        {hasSession === null && (
          <span aria-hidden="true" className={PANEL_LINK}>
            <span className="h-4 w-14 rounded-md bg-muted" />
          </span>
        )}
      </div>
    </nav>
  );
}
