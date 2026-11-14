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

// `Button` fades every property, `visibility` included: when the answer flips,
// the variant that hides would stay drawn over the one that shows for 150 ms.
const BUTTON_TRANSITION =
  "transition-[color,background-color,border-color,box-shadow,translate]";

// The guest buttons. Hidden, they are not prefetched: a signed-in visitor
// would load /sign-in and /register for links nobody sees.
function GuestActions({ hidden }: { hidden: boolean }) {
  const t = useTranslations("marketing");
  const prefetch = hidden ? false : undefined;

  return (
    <div
      className={cn(
        "col-start-1 row-start-1 flex items-center gap-2 justify-self-end",
        hidden && "invisible",
      )}
    >
      <Button
        asChild
        variant="ghost"
        size="lg"
        className={cn(
          "hidden px-3.5 text-muted-foreground md:inline-flex",
          BUTTON_TRANSITION,
        )}
      >
        <Link href="/sign-in" prefetch={prefetch}>
          {t("nav.signIn")}
        </Link>
      </Button>
      <Button asChild size="lg" className={cn("px-3.5", BUTTON_TRANSITION)}>
        <Link href="/register" prefetch={prefetch}>
          {t("nav.getStarted")}
        </Link>
      </Button>
    </div>
  );
}

// The main action of a signed-in visitor. Hidden, it is not prefetched: a
// guest would load /dashboard, which the proxy sends to sign-in.
function MemberAction({ hidden }: { hidden: boolean }) {
  const t = useTranslations("marketing");

  return (
    <div
      className={cn(
        "col-start-1 row-start-1 flex items-center justify-self-end",
        hidden && "invisible",
      )}
    >
      <Button asChild size="lg" className={cn("px-3.5", BUTTON_TRANSITION)}>
        <Link href="/dashboard" prefetch={hidden ? false : undefined}>
          {t("nav.dashboard")}
        </Link>
      </Button>
    </div>
  );
}

// Sign in and the main action, which depend on the session. The static page
// renders as a guest and the answer comes after mount, so both variants stay
// in the markup, stacked in one grid cell as wide as the wider of the two: the
// place is kept whatever the answer, and the language link beside it never
// moves. The variant that does not apply (both, until the answer) is
// `invisible`, which also takes it out of the tab order and the accessibility
// tree; a signed-in user never sees Sign in flash.
function SessionActions({ hasSession }: { hasSession: boolean | null }) {
  return (
    <div className="grid items-center">
      <GuestActions hidden={hasSession !== false} />
      <MemberAction hidden={hasSession !== true} />
    </div>
  );
}

export function Navbar() {
  const t = useTranslations("marketing");
  const home = homePath(useLocale());
  const scrolled = useScrolled();
  const hasSession = useHasSession();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEscapeToClose(open, () => setOpen(false), toggleRef);

  const solid = scrolled || open;

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
          <SessionActions hasSession={hasSession} />
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
          signedIn={hasSession === true}
          onClose={() => setOpen(false)}
        />
      )}
    </header>
  );
}
