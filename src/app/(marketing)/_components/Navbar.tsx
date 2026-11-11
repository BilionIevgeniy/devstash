"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useHasSession } from "@/features/auth/components/hooks/use-has-session";
import { cn } from "@/lib/utils";

import { useScrolled } from "./hooks/use-scrolled";
import { MobileNavPanel } from "./MobileNavPanel";

const PANEL_ID = "mobile-nav";
const DESKTOP_LINK = "transition-colors hover:text-foreground";
const GUEST_ACTION = { href: "/register", label: "Get Started" };
const SIGNED_IN_ACTION = { href: "/dashboard", label: "Dashboard" };

export function Navbar() {
  const scrolled = useScrolled();
  const signedIn = useHasSession();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const solid = scrolled || open;
  const primaryAction = signedIn ? SIGNED_IN_ACTION : GUEST_ACTION;

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
          aria-label="Main"
          className="hidden gap-6 text-sm text-muted-foreground md:flex"
        >
          <Link href="/#features" className={DESKTOP_LINK}>
            Features
          </Link>
          <Link href="/#pricing" className={DESKTOP_LINK}>
            Pricing
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!signedIn && (
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="hidden px-3.5 text-muted-foreground md:inline-flex"
            >
              <Link href="/sign-in">Sign In</Link>
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
            aria-label={open ? "Close menu" : "Open menu"}
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
