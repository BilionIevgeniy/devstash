"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useHasSession } from "@/features/auth/components/hooks/use-has-session";
import { homePath } from "@/i18n/config";
import { cn } from "@/lib/utils";

import { useEscapeToClose } from "./hooks/use-escape-to-close";
import { useScrolled } from "./hooks/use-scrolled";
import { LanguageLink } from "./LanguageLink";
import { MobileNavPanel } from "./MobileNavPanel";

const PANEL_ID = "mobile-nav";
const DESKTOP_LINK = "transition-colors hover:text-foreground";

export function Navbar() {
  const t = useTranslations("marketing");
  const home = homePath(useLocale());
  const scrolled = useScrolled();
  const signedIn = useHasSession();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEscapeToClose(open, () => setOpen(false), toggleRef);

  const solid = scrolled || open;
  const primaryAction = signedIn
    ? { href: "/dashboard", label: t("nav.dashboard") }
    : { href: "/register", label: t("nav.getStarted") };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-10 border-b backdrop-blur-md transition-colors duration-200",
        solid
          ? "border-border bg-background/88"
          : "border-transparent bg-background/55",
      )}
    >
      <div className="marketing-container flex h-16 items-center gap-8">
        <Logo />
        <nav
          aria-label={t("nav.main")}
          className="hidden gap-6 text-sm text-muted-foreground md:flex"
        >
          <Link href={`${home}#features`} className={DESKTOP_LINK}>
            {t("nav.features")}
          </Link>
          <Link href={`${home}#pricing`} className={DESKTOP_LINK}>
            {t("nav.pricing")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageLink
            variant="code"
            className="hidden px-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
          />
          {!signedIn && (
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="hidden px-3.5 text-muted-foreground md:inline-flex"
            >
              <Link href="/sign-in">{t("nav.signIn")}</Link>
            </Button>
          )}
          <Button asChild size="lg" className="px-3.5">
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
          <Button
            ref={toggleRef}
            variant="ghost"
            size="icon-lg"
            className="size-11 md:hidden"
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={open}
            aria-controls={PANEL_ID}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <MobileNavPanel
          id={PANEL_ID}
          signedIn={signedIn}
          onClose={() => setOpen(false)}
        />
      )}
    </header>
  );
}
